package com.blockout.backend.api;

import static org.assertj.core.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.*;
import org.springframework.web.bind.annotation.*;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"management.server.port=0"})
@Import(SecurityIntegrationTest.Probes.class)
@Testcontainers
class SecurityIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static HttpServer jwks;
  static RSAKey key;
  static final AtomicBoolean unavailable = new AtomicBoolean();

  static {
    try {
      key = new RSAKeyGenerator(2048).keyID("first").generate();
      jwks = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      jwks.createContext(
          "/jwks",
          ex -> {
            byte[] body =
                new JWKSet(key.toPublicJWK())
                    .toString()
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(unavailable.get() ? 503 : 200, body.length);
            ex.getResponseBody().write(body);
            ex.close();
          });
      jwks.start();
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry p) {
    p.add("spring.datasource.url", DB::getJdbcUrl);
    p.add("spring.datasource.username", DB::getUsername);
    p.add("spring.datasource.password", DB::getPassword);
    p.add("blockout.auth.issuer", () -> "https://issuer.example/");
    p.add("blockout.auth.audience", () -> "blockout-test");
    p.add(
        "blockout.auth.jwk-set-uri",
        () -> "http://127.0.0.1:" + jwks.getAddress().getPort() + "/jwks");
  }

  @LocalServerPort int port;

  @AfterAll
  static void shutdown() {
    jwks.stop(0);
  }

  @Test
  void rejectsMissingAuthentication() throws Exception {
    var r = get("/api/v2/test", null);
    assertThat(r.statusCode()).isEqualTo(401);
    assertThat(r.headers().firstValue("www-authenticate")).isPresent();
    assertThat(r.body()).contains("AUTHENTICATION_REQUIRED").doesNotContain("exception");
  }

  @Test
  void acceptsValidToken() throws Exception {
    assertThat(
            get(
                    "/api/v2/test",
                    token(
                        key,
                        "https://issuer.example/",
                        "blockout-test",
                        Instant.now().plusSeconds(300)))
                .statusCode())
        .isEqualTo(200);
  }

  @Test
  void deniesAuthenticatedAccessWithoutAuthority() throws Exception {
    assertThat(get("/api/v2/staff", valid()).statusCode()).isEqualTo(403);
  }

  @Test
  void rejectsWrongAudienceIssuerExpiryAndSignature() throws Exception {
    assertThat(
            get(
                    "/api/v2/test",
                    token(key, "https://issuer.example/", "wrong", Instant.now().plusSeconds(300)))
                .statusCode())
        .isEqualTo(401);
    assertThat(
            get(
                    "/api/v2/test",
                    token(
                        key,
                        "https://wrong.example/",
                        "blockout-test",
                        Instant.now().plusSeconds(300)))
                .statusCode())
        .isEqualTo(401);
    assertThat(
            get(
                    "/api/v2/test",
                    token(
                        key,
                        "https://issuer.example/",
                        "blockout-test",
                        Instant.now().minusSeconds(120)))
                .statusCode())
        .isEqualTo(401);
    assertThat(
            get(
                    "/api/v2/test",
                    token(
                        new RSAKeyGenerator(2048).keyID(key.getKeyID()).generate(),
                        "https://issuer.example/",
                        "blockout-test",
                        Instant.now().plusSeconds(300)))
                .statusCode())
        .isEqualTo(401);
  }

  @Test
  void refreshesRotatedKeysAndFailsClosedDuringOutage() throws Exception {
    assertThat(get("/api/v2/test", valid()).statusCode()).isEqualTo(200);
    key = new RSAKeyGenerator(2048).keyID("rotated").generate();
    String cached = valid();
    assertThat(get("/api/v2/test", cached).statusCode()).isEqualTo(200);
    unavailable.set(true);
    try {
      assertThat(get("/api/v2/test", cached).statusCode()).isEqualTo(200);
      var unknown = new RSAKeyGenerator(2048).keyID("unknown").generate();
      assertThat(
              get(
                      "/api/v2/test",
                      token(
                          unknown,
                          "https://issuer.example/",
                          "blockout-test",
                          Instant.now().plusSeconds(300)))
                  .statusCode())
          .isEqualTo(401);
    } finally {
      unavailable.set(false);
    }
  }

  @Test
  void neverExposesManagementOnTheProductPort() throws Exception {
    assertThat(get("/actuator/prometheus", null).statusCode()).isEqualTo(401);
  }

  @Test
  void deniesAnUnregisteredProductRoute() throws Exception {
    assertThat(get("/api/v2/unknown", valid()).statusCode()).isEqualTo(403);
  }

  String valid() throws Exception {
    return token(key, "https://issuer.example/", "blockout-test", Instant.now().plusSeconds(300));
  }

  static String token(RSAKey signing, String issuer, String audience, Instant expires)
      throws Exception {
    var jwt =
        new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signing.getKeyID()).build(),
            new JWTClaimsSet.Builder()
                .subject("test-subject")
                .issuer(issuer)
                .audience(audience)
                .expirationTime(Date.from(expires))
                .issueTime(new Date())
                .build());
    jwt.sign(new RSASSASigner(signing));
    return jwt.serialize();
  }

  HttpResponse<String> get(String path, String token) throws Exception {
    var b =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .timeout(java.time.Duration.ofSeconds(10));
    if (token != null) b.header("Authorization", "Bearer " + token);
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  @TestConfiguration
  static class Probes {
    @Bean
    ProbeController controller() {
      return new ProbeController();
    }

    @Bean
    ApiRoutePolicy testRoutes() {
      return requests -> requests.requestMatchers("/api/v2/test", "/api/v2/staff").authenticated();
    }
  }

  @RestController
  static class ProbeController {
    @GetMapping("/api/v2/test")
    String test() {
      return "ok";
    }

    @PreAuthorize("hasAuthority('staff')")
    @GetMapping("/api/v2/staff")
    String staff() {
      return "ok";
    }
  }
}
