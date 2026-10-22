package com.blockout.backend.access.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Opt-in cross-owner qualification using the actual server, PostgreSQL and existing Jest Expo
 * runner. Only native credential I/O and the isolated JWT issuer are controlled; no HTTP provider
 * is mocked. Run after npm ci and npm run generate; it needs no Auth0 secret or production grant.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@EnabledIfEnvironmentVariable(named = "BLOCKOUT_ACCESS_CONSUMERS_TEST", matches = "true")
@DisplayName("Generated mobile consumers against the real settings provider")
class AccessSettingsConsumersIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static HttpServer keys;
  private static RSAKey signingKey;
  private static String issuer;
  @LocalServerPort private int port;
  @Autowired private JdbcTemplate sql;
  @Autowired private AccountStore accounts;
  @Autowired private PlatformTransactionManager transactions;

  /**
   * Applies the actual schema and serves only an ephemeral public signing key on loopback.
   *
   * @param properties isolated server and database inputs for the application context
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
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

  /** Stops this suite's key server; Testcontainers owns its separate disposable database. */
  @AfterAll
  static void closeKeys() {
    if (keys != null) keys.stop(0);
  }

  @Test
  @DisplayName(
      "Exercises two editors, conflicts, independent groups and retained uncertain drafts over real HTTP")
  void qualifiesGeneratedConsumers() throws Exception {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    for (String subject : List.of("first", "second")) {
      UUID id =
          transaction.execute(
              s ->
                  accounts
                      .create(
                          issuer,
                          "auth0|" + subject,
                          subject + "_175",
                          subject + "@example.invalid",
                          null)
                      .id());
      sql.update(
          "INSERT INTO account_permission(account_id,permission) VALUES (?, 'maintenance.manage'), (?, 'application-versions.manage')",
          id,
          id);
    }
    Path repository = Path.of("..", "..").toAbsolutePath().normalize();
    ProcessBuilder builder =
        new ProcessBuilder(
                "npm",
                "run",
                "test",
                "--workspace=@blockout/mobile",
                "--",
                "--runInBand",
                "--runTestsByPath",
                "src/features/access/__tests__/maintenance-settings-provider.test.tsx")
            .directory(repository.toFile())
            .redirectErrorStream(true)
            .redirectOutput(
                repository.resolve("apps/backend/target/access-consumers.log").toFile());
    builder.environment().put("BLOCKOUT_ACCESS_PROVIDER_URL", "http://127.0.0.1:" + port);
    builder.environment().put("BLOCKOUT_ACCESS_EDITOR_ONE", token("first"));
    builder.environment().put("BLOCKOUT_ACCESS_EDITOR_TWO", token("second"));

    // When
    Process consumer = builder.start();
    boolean finished = consumer.waitFor(90, TimeUnit.SECONDS);
    if (!finished) consumer.destroyForcibly();

    // Then
    assertThat(finished)
        .as("Existing Jest runner finishes; details in target/access-consumers.log")
        .isTrue();
    assertThat(consumer.exitValue())
        .as("Generated consumer and form integration; details in target/access-consumers.log")
        .isZero();
  }

  /**
   * Signs short-lived synthetic mobile claims for the real resource-server decoder without logging
   * tokens.
   *
   * @param subject fixture identity suffix for one of the two editors
   * @return a short-lived token accepted only by this isolated resource server
   */
  private static String token(String subject) {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .subject("auth0|" + subject)
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
