package com.blockout.backend.api.security.api;

import static org.assertj.core.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
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

/**
 * Exercises real HTTP security and MVC errors with controlled signing keys and test-only routes.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "management.server.port=0",
      "blockout.revenuecat.webhook.authorization=Bearer fixture-webhook-secret",
      "blockout.identity.native-client-ids=native-client",
      "blockout.identity.auth0.base-url=https://issuer.example",
      "blockout.identity.auth0.client-id=fixture",
      "blockout.identity.auth0.client-secret=fixture",
      "blockout.identity.billing.project-id=project",
      "blockout.identity.billing.environment=production"
    })
@Import(SecurityIntegrationTest.Probes.class)
@Testcontainers
class SecurityIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static HttpServer jwks;
  static volatile RSAKey key;
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
            try (ex;
                var responseBody = ex.getResponseBody()) {
              responseBody.write(body);
            }
          });
      jwks.start();
    } catch (IOException | JOSEException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  /**
   * Routes the application to isolated SQL and JWKS fixtures before context startup.
   *
   * @param p Spring dynamic configuration registry
   */
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
  void rejectsMissingAuthentication() throws IOException, InterruptedException {
    var r = get("/api/v2/test", null);

    assertThat(r.statusCode()).isEqualTo(401);

    assertThat(r.headers().firstValue("www-authenticate")).isPresent();

    assertThat(r.headers().firstValue("content-type")).contains("application/problem+json");
    var problem = new tools.jackson.databind.json.JsonMapper().readTree(r.body());

    assertThat(problem.path("status").asInt()).isEqualTo(401);

    assertThat(problem.path("code").asString()).isEqualTo("AUTHENTICATION_REQUIRED");

    assertThat(problem.path("type").asString("about:blank")).isEqualTo("about:blank");

    assertThat(problem.path("detail").asString()).isEqualTo("Authentication required.");

    assertThat(r.body()).doesNotContain("exception", "test-subject");
  }

  @Test
  void acceptsValidToken() throws IOException, InterruptedException, JOSEException {
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
  void deniesAuthenticatedAccessWithoutAuthority()
      throws IOException, InterruptedException, JOSEException {
    assertThat(get("/api/v2/staff", valid()).statusCode()).isEqualTo(403);
  }

  @org.junit.jupiter.params.ParameterizedTest(name = "rejects {0}")
  @org.junit.jupiter.params.provider.EnumSource(InvalidToken.class)
  void rejectsInvalidToken(InvalidToken scenario)
      throws IOException, InterruptedException, JOSEException {
    var signing =
        scenario == InvalidToken.SIGNATURE
            ? new RSAKeyGenerator(2048).keyID(key.getKeyID()).generate()
            : key;
    String issuer =
        scenario == InvalidToken.ISSUER ? "https://wrong.example/" : "https://issuer.example/";
    String audience = scenario == InvalidToken.AUDIENCE ? "wrong" : "blockout-test";
    var expires =
        scenario == InvalidToken.EXPIRED
            ? Instant.now().minusSeconds(120)
            : Instant.now().plusSeconds(300);

    if (scenario == InvalidToken.MISSING_EXPIRY) expires = null;
    var notBefore = scenario == InvalidToken.NOT_YET_VALID ? Instant.now().plusSeconds(300) : null;

    var response = get("/api/v2/test", token(signing, issuer, audience, expires, notBefore));

    assertThat(response.statusCode()).isEqualTo(401);

    assertThat(response.body())
        .contains("AUTHENTICATION_REQUIRED")
        .doesNotContain("test-subject", "exception");
  }

  /** Enumerates one invalid trust constraint per parameterized JWT scenario. */
  enum InvalidToken {
    AUDIENCE,
    ISSUER,
    EXPIRED,
    SIGNATURE,
    MISSING_EXPIRY,
    NOT_YET_VALID
  }

  @Test
  void refreshesRotatedSigningKeys() throws IOException, InterruptedException, JOSEException {
    assertThat(get("/api/v2/test", valid()).statusCode()).isEqualTo(200);
    key = new RSAKeyGenerator(2048).keyID("rotated").generate();

    var response = get("/api/v2/test", valid());

    assertThat(response.statusCode()).isEqualTo(200);
  }

  @Test
  void acceptsCachedKeyDuringJwksOutage() throws IOException, InterruptedException, JOSEException {
    String cached = valid();

    assertThat(get("/api/v2/test", cached).statusCode()).isEqualTo(200);
    unavailable.set(true);

    try {
      var response = get("/api/v2/test", cached);

      assertThat(response.statusCode()).isEqualTo(200);
    } finally {
      unavailable.set(false);
    }
  }

  @Test
  void deniesUnknownKeyDuringJwksOutage() throws IOException, InterruptedException, JOSEException {
    var unknown = new RSAKeyGenerator(2048).keyID("unknown").generate();
    var token =
        token(unknown, "https://issuer.example/", "blockout-test", Instant.now().plusSeconds(300));
    unavailable.set(true);

    try {
      var response = get("/api/v2/test", token);

      assertThat(response.statusCode()).isEqualTo(401);
      assertThat(response.body()).doesNotContain("test-subject", "exception", "jwks");
    } finally {
      unavailable.set(false);
    }
  }

  @Test
  void neverExposesManagementOnTheProductPort() throws IOException, InterruptedException {
    assertThat(get("/actuator/prometheus", null).statusCode()).isEqualTo(401);
  }

  @Test
  void deniesAnUnregisteredProductRoute() throws IOException, InterruptedException, JOSEException {
    assertThat(get("/api/v2/unknown", valid()).statusCode()).isEqualTo(403);
  }

  /**
   * Signs a short-lived token with the currently published fixture key.
   *
   * @return a token accepted by the configured test trust boundary
   */
  String valid() throws JOSEException {
    return token(key, "https://issuer.example/", "blockout-test", Instant.now().plusSeconds(300));
  }

  /**
   * Signs a test token without a not-before claim.
   *
   * @param signing fixture private key
   * @param issuer issuer claim under test
   * @param audience audience claim under test
   * @param expires expiry instant, or null to omit the claim
   * @return the serialized JWT
   */
  static String token(RSAKey signing, String issuer, String audience, Instant expires)
      throws JOSEException {
    return token(signing, issuer, audience, expires, null);
  }

  /**
   * Signs explicit test claims, including intentionally invalid or omitted time constraints.
   *
   * @param signing fixture private key
   * @param issuer issuer claim under test
   * @param audience audience claim under test
   * @param expires nullable expiry claim
   * @param notBefore nullable activation claim
   * @return the serialized JWT
   */
  static String token(
      RSAKey signing, String issuer, String audience, Instant expires, Instant notBefore)
      throws JOSEException {
    var jwt =
        new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signing.getKeyID()).build(),
            new JWTClaimsSet.Builder()
                .subject("test-subject")
                .issuer(issuer)
                .audience(audience)
                .expirationTime(expires == null ? null : Date.from(expires))
                .notBeforeTime(notBefore == null ? null : Date.from(notBefore))
                .issueTime(new Date())
                .build());
    jwt.sign(new RSASSASigner(signing));
    return jwt.serialize();
  }

  /**
   * Calls the real test HTTP server and closes the per-request client.
   *
   * @param path test route on the random local port
   * @param token optional bearer credential
   * @return the unmodified HTTP response
   */
  HttpResponse<String> get(String path, String token) throws IOException, InterruptedException {
    var b =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .timeout(java.time.Duration.ofSeconds(10));
    if (token != null) b.header("Authorization", "Bearer " + token);
    try (var client = HttpClient.newHttpClient()) {
      return client.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.CsvSource(
      delimiter = '|',
      textBlock =
          """
      GET | /api/v2/test?limit=private-value | {} | application/json | application/json | 400 | INVALID_REQUEST
      GET | /api/v2/test?limit=0 | {} | application/json | application/json | 400 | INVALID_REQUEST
      POST | /api/v2/test | { | application/json | application/json | 400 | INVALID_REQUEST
      POST | /api/v2/test | {"name":""} | application/json | application/json | 400 | INVALID_REQUEST
      POST | /api/v2/test | {"name":"valid"} | text/plain | application/json | 415 | MEDIA_TYPE_NOT_SUPPORTED
      PUT | /api/v2/test | {} | application/json | application/json | 405 | METHOD_NOT_ALLOWED
      POST | /api/v2/test | {"name":"valid"} | application/json | text/plain | 406 | RESPONSE_NOT_ACCEPTABLE
      GET | /api/v2/test/missing | {} | application/json | application/json | 404 | RESOURCE_NOT_FOUND
      """)
  void mvcErrorsUseTheSharedProblemContract(
      String method,
      String path,
      String body,
      String contentType,
      String accept,
      int status,
      String code)
      throws IOException, InterruptedException, JOSEException {
    var request =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .header("Authorization", "Bearer " + valid())
            .header("Content-Type", contentType)
            .header("Accept", accept)
            .method(method, HttpRequest.BodyPublishers.ofString(body))
            .build();

    try (var client = HttpClient.newHttpClient()) {
      var response = client.send(request, HttpResponse.BodyHandlers.ofString());

      assertThat(response.statusCode()).isEqualTo(status);
      assertThat(response.headers().firstValue("content-type"))
          .contains("application/problem+json");
      assertThat(response.headers().firstValue("cache-control").orElse("")).contains("no-store");
      var problem = new tools.jackson.databind.json.JsonMapper().readTree(response.body());
      assertThat(problem.path("code").asString()).isEqualTo(code);
      assertThat(problem.path("status").asInt()).isEqualTo(status);
      assertThat(problem.path("detail").asString()).isNotBlank();
      assertThat(response.body())
          .doesNotContain("private-value", "java.lang", "Exception", "stackTrace");
      if (status == 405)
        assertThat(response.headers().firstValue("allow").orElse("")).contains("GET", "POST");
    }
  }

  /** Registers probes only in the integration-test application, never in production. */
  @TestConfiguration
  static class Probes {
    /**
     * Creates HTTP probes used to exercise framework security and validation paths.
     *
     * @return the test-only controller
     */
    @Bean
    ProbeController controller() {
      return new ProbeController();
    }

    /**
     * Allows test routes through URL authentication so MVC and method security can be exercised.
     *
     * @return the test-only route policy
     */
    @Bean
    ApiRoutePolicy testRoutes() {
      return requests ->
          requests
              .requestMatchers("/api/v2/test", "/api/v2/test/**", "/api/v2/staff")
              .authenticated();
    }
  }

  /** Supplies minimal routes for framework-level errors without adding product endpoints. */
  @RestController
  static class ProbeController {
    /**
     * Exercises query conversion and native MVC parameter constraints.
     *
     * @param limit positive fixture limit validated by Spring
     * @return a fixed success body
     */
    @GetMapping("/api/v2/test")
    String test(
        @jakarta.validation.constraints.Min(1) @RequestParam(defaultValue = "1") int limit) {
      return "ok";
    }

    /** Supplies a minimal body constraint for real MVC JSON validation. */
    record TestBody(@jakarta.validation.constraints.NotBlank String name) {}

    /**
     * Exercises request-body validation and response negotiation.
     *
     * @param body validated fixture body
     * @return the same body for a successful request
     */
    @PostMapping(
        value = "/api/v2/test",
        consumes = "application/json",
        produces = "application/json")
    TestBody create(@jakarta.validation.Valid @RequestBody TestBody body) {
      return body;
    }

    /**
     * Exercises method authorization after successful JWT authentication.
     *
     * @return a fixed body only when the caller has staff authority
     */
    @PreAuthorize("hasAuthority('staff')")
    @GetMapping("/api/v2/staff")
    String staff() {
      return "ok";
    }
  }
}
