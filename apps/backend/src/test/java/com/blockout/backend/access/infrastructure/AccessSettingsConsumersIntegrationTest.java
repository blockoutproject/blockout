package com.blockout.backend.access.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Opt-in generated-client wire qualification using the actual server, PostgreSQL and existing Jest
 * Expo runner. Node Fetch replaces native networking, and an isolated issuer signs synthetic
 * credentials. Run after npm ci and npm run generate; no Auth0 secret or production grant is
 * needed.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "BLOCKOUT_ACCESS_CONSUMERS_TEST", matches = "true")
@DisplayName("Generated mobile consumers against the real settings provider")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AccessSettingsConsumersIntegrationTest {
  private static HttpServer keys;
  private static RSAKey signingKey;
  private static String issuer;
  @LocalServerPort private int port;
  @Autowired private JdbcTemplate sql;
  @Autowired private AccountStore accounts;
  @Autowired private PlatformTransactionManager transactions;

  /**
   * Starts the isolated signing-key server; Spring separately owns the migrated database.
   *
   * @param properties native registry for the suite-specific non-database settings
   * @throws Exception if the isolated signing key or loopback server cannot be initialized
   */
  @DynamicPropertySource
  static void identityIssuer(DynamicPropertyRegistry properties) throws Exception {
    signingKey = new RSAKeyGenerator(2048).keyID("settings-qualification").generate();
    keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    keys.createContext(
        "/.well-known/jwks.json",
        exchange -> {
          byte[] body =
              new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    keys.start();
    issuer = "http://127.0.0.1:" + keys.getAddress().getPort() + "/";
    properties.add("blockout.security.issuer", () -> issuer);
  }

  /** Stops this suite's key server; Spring owns its separate disposable database. */
  @AfterAll
  static void closeKeys() {
    if (keys != null) {
      keys.stop(0);
    }
  }

  @Test
  @DisplayName(
      "Exercises generated PATCH presence, response decoding and conflict problems over HTTP")
  void qualifiesGeneratedConsumers() throws Exception {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    UUID id =
        transaction.execute(
            s ->
                accounts
                    .create(issuer, "auth0|editor", "editor_175", "editor@example.invalid")
                    .id());
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'maintenance.manage'), (?, 'application-versions.manage')",
        id,
        id);
    Path repository = Path.of("..", "..").toAbsolutePath().normalize();
    Path log = repository.resolve("apps/backend/target/access-consumers.log");
    ProcessBuilder builder =
        new ProcessBuilder(
                "node",
                repository.resolve("node_modules/jest/bin/jest.js").toString(),
                "--config",
                "jest.config.cjs",
                "--ci",
                "--runInBand",
                "--runTestsByPath",
                "src/features/access/__tests__/maintenance-settings-provider.test.tsx")
            .directory(repository.resolve("apps/mobile").toFile())
            .redirectErrorStream(true)
            .redirectOutput(log.toFile());
    builder.environment().put("BLOCKOUT_ACCESS_PROVIDER_URL", "http://127.0.0.1:" + port);
    builder.environment().put("BLOCKOUT_ACCESS_EDITOR_TOKEN", token());

    // When
    Process consumer = builder.start();
    try {
      boolean finished = consumer.waitFor(Duration.ofSeconds(90));

      // Then
      assertThat(finished).as("Wire suite completes; details in %s", log).isTrue();
      assertThat(consumer.exitValue())
          .as("Generated client assertions; details in %s", log)
          .isZero();
    } finally {
      consumer.destroyForcibly();
      assertThat(consumer.waitFor(5, TimeUnit.SECONDS)).as("Jest child terminates").isTrue();
    }
  }

  /**
   * Signs short-lived synthetic mobile claims for the real resource-server decoder without logging
   * tokens.
   *
   * @return a short-lived token accepted only by this isolated resource server
   */
  private static String token() {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .subject("auth0|editor")
            .audience(List.of("mobile-test"))
            .claim("azp", "mobile-test")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(120))
            .build();
    return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)))
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build(),
                claims))
        .getTokenValue();
  }
}
