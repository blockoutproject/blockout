package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.contributions.application.ModerateContribution;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
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
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;

/**
 * Opt-in Orval/F13 qualification over real signed HTTP, sporting owners and local F05 erasure.
 * Spring owns the migrated PostgreSQL container. Only the identity issuer and native networking are
 * controlled; provider cleanup stays disabled and no native appearance is qualified.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@TestPropertySource(
    properties = {"server.port=8289", "blockout.accounts.cleanup.environment=disabled"})
@EnabledIfEnvironmentVariable(named = "BLOCKOUT_CONTRIBUTION_CONSUMERS_TEST", matches = "true")
@DisplayName("Generated contribution consumers across original-account erasure")
class ContributionErasureConsumersIntegrationTest extends ContributionScenario {
  private static final UUID OBSERVER = UUID.fromString("00000000-0000-4000-8000-000000000004");
  private static final UUID SECOND_REPORTER =
      UUID.fromString("00000000-0000-4000-8000-000000000005");
  private static final UUID THIRD_REPORTER =
      UUID.fromString("00000000-0000-4000-8000-000000000006");
  private static HttpServer keys;
  private static RSAKey signingKey;
  private static String issuer;
  @Autowired private ReportContribution reporting;
  @Autowired private ModerateContribution moderation;

  /**
   * Supplies the isolated issuer to the actual Spring resource-server decoder.
   *
   * @param properties registry for the local signing-key endpoint
   * @throws Exception if key generation or loopback binding fails
   */
  @DynamicPropertySource
  static void identityIssuer(DynamicPropertyRegistry properties) throws Exception {
    signingKey = new RSAKeyGenerator(2048).keyID("contribution-erasure").generate();
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

  /** Stops only this suite's signing-key server after its consumer finishes. */
  @AfterAll
  static void closeKeys() {
    if (keys != null) {
      keys.stop(0);
    }
  }

  @Test
  @DisplayName("Lost responses and erased delayed actors preserve anonymous useful history")
  void qualifiesGeneratedConsumers() throws Exception {
    // Given: actual F02 match admission comes from ContributionScenario, not a fabricated DTO.
    sql.update("UPDATE account SET issuer=?", issuer);
    for (UUID account : List.of(OBSERVER, SECOND_REPORTER, THIRD_REPORTER)) {
      sql.update(
          "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,?,?,?,'synthetic@example.invalid')",
          account,
          issuer,
          account.toString(),
          "Fixture" + account.toString().substring(30));
    }
    moderator(OTHER);
    moderator(OBSERVER);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'maintenance.manage')",
        OBSERVER);
    SubmitContribution.Outcome source = submit(AUTHOR, "0", "https://youtu.be/source", false);
    for (UUID reporter : List.of(FOLLOWER, SECOND_REPORTER, THIRD_REPORTER)) {
      reporting.report(reporter, source.version().id(), "Synthetic retained reason");
    }
    SubmitContribution.Outcome selected = submit(AUTHOR, "4", "https://twitch.tv/selected", false);
    moderation.change(
        OTHER, matchId, selected.version().id(), "5", StreamModerationActionEnum.APPROVE);
    Path repository = Path.of("..", "..").toAbsolutePath().normalize();
    Path log = repository.resolve("apps/backend/target/contribution-erasure-consumers.log");
    // Direct in-band Jest has no npm shell or worker tree to outlive the bounded caller.
    ProcessBuilder builder =
        new ProcessBuilder(
                "node",
                repository.resolve("node_modules/jest/bin/jest.js").toString(),
                "--config",
                "jest.config.cjs",
                "--runInBand",
                "--reporters=default",
                "--runTestsByPath",
                "src/features/contributions/__tests__/contribution-erasure-provider.test.tsx")
            .directory(repository.resolve("apps/mobile").toFile())
            .redirectErrorStream(true)
            .redirectOutput(log.toFile());
    builder.environment().put("BLOCKOUT_CONTRIBUTION_PROVIDER_URL", "http://127.0.0.1:8289");
    builder.environment().put("BLOCKOUT_CONTRIBUTION_MATCH_ID", matchId.toString());
    builder.environment().put("BLOCKOUT_CONTRIBUTION_SOURCE_ID", source.version().id().toString());
    builder
        .environment()
        .put("BLOCKOUT_CONTRIBUTION_SELECTED_ID", selected.version().id().toString());
    for (String role : List.of("AUTHOR", "MODERATOR", "REPORTER", "OBSERVER")) {
      UUID account =
          switch (role) {
            case "AUTHOR" -> AUTHOR;
            case "MODERATOR" -> OTHER;
            case "REPORTER" -> FOLLOWER;
            default -> OBSERVER;
          };
      builder.environment().put("BLOCKOUT_CONTRIBUTION_" + role + "_ID", account.toString());
      builder.environment().put("BLOCKOUT_CONTRIBUTION_" + role + "_TOKEN", token(account));
    }

    // When
    Process consumer = builder.start();
    try {
      boolean finished = consumer.waitFor(Duration.ofSeconds(90));

      // Then
      assertThat(finished)
          .as("Jest completes; details in target/contribution-erasure-consumers.log")
          .isTrue();
      assertThat(consumer.exitValue())
          .as("Generated consumer assertions; details in target/contribution-erasure-consumers.log")
          .isZero();
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM contribution_version WHERE owner_id IS NOT NULL OR publication_actor_id IS NOT NULL OR decision_actor_id IS NOT NULL",
                  Long.class))
          .isZero();
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM contribution_report WHERE reporter_id IS NULL AND reason IS NULL",
                  Long.class))
          .isEqualTo(1);
      assertThat(contributions.active(matchId).orElseThrow().ownerId()).isNull();
      assertThat(contributions.active(matchId).orElseThrow().sourceVersionId())
          .isEqualTo(source.version().id());
      assertThat(contributions.state(matchId).revision()).isEqualTo(8);
    } finally {
      consumer.destroyForcibly();
      consumer.waitFor(5, TimeUnit.SECONDS);
    }
  }

  /**
   * Signs short-lived fixture claims without exposing credentials in test output.
   *
   * @param account exact original synthetic principal
   * @return token accepted only by this suite's isolated issuer
   */
  private static String token(UUID account) {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(account.toString())
            .audience(List.of("mobile-test"))
            .claim("azp", "mobile-test")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(180))
            .build();
    return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)))
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build(),
                claims))
        .getTokenValue();
  }
}
