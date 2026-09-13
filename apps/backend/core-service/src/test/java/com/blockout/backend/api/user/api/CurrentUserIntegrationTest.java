package com.blockout.backend.api.user.api;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.blockout.backend.identity.user.application.*;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.*;
import java.net.http.*;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

/**
 * Verifies profile HTTP semantics against PostgreSQL with an isolated JWT issuer and stubbed
 * provider.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "management.server.port=0",
      "blockout.revenuecat.webhook.authorization=Bearer fixture-webhook-secret",
      "blockout.identity.native-client-ids=native-client",
      "blockout.identity.auth0.base-url=https://tenant.example",
      "blockout.identity.auth0.client-id=fixture",
      "blockout.identity.auth0.client-secret=fixture",
      "blockout.identity.billing.project-id=project",
      "blockout.identity.billing.environment=production"
    })
@Testcontainers
class CurrentUserIntegrationTest {
  @AutoClose static final ClassLoaderResourceAccessor resources = new ClassLoaderResourceAccessor();
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static final RSAKey KEY;
  static final HttpServer JWKS;

  static {
    try {
      KEY = new RSAKeyGenerator(2048).keyID("identity").generate();
      JWKS = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
      JWKS.createContext(
          "/jwks",
          ex -> {
            byte[] body =
                new JWKSet(KEY.toPublicJWK())
                    .toString()
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(200, body.length);
            try (ex;
                var responseBody = ex.getResponseBody()) {
              responseBody.write(body);
            }
          });
      JWKS.start();
    } catch (IOException | JOSEException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  /**
   * Routes the real API to isolated PostgreSQL and JWKS fixtures.
   *
   * @param p Spring dynamic configuration registry
   */
  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry p) {
    p.add("spring.datasource.url", DB::getJdbcUrl);
    p.add("spring.datasource.username", DB::getUsername);
    p.add("spring.datasource.password", DB::getPassword);
    p.add("blockout.auth.issuer", () -> "https://tenant.example/");
    p.add("blockout.auth.audience", () -> "core");
    p.add(
        "blockout.auth.jwk-set-uri",
        () -> "http://127.0.0.1:" + JWKS.getAddress().getPort() + "/jwks");
  }

  @Autowired JdbcTemplate sql;
  @Autowired io.micrometer.core.instrument.MeterRegistry metrics;
  @MockitoBean UserIdentityProvider provider;
  @LocalServerPort int port;

  /** Applies the production schema before profile HTTP scenarios execute. */
  @BeforeAll
  static void migrate() throws SQLException, LiquibaseException {
    try (var c =
            java.sql.DriverManager.getConnection(
                DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
        var statement = c.createStatement()) {
      statement.execute(
          "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE ROLE blockout_api; CREATE ROLE blockout_worker");
      try (var connection = new JdbcConnection(c);
          var lb = new Liquibase("db/changelog/db.changelog-master.xml", resources, connection)) {
        lb.update("");
      }
    }
  }

  @BeforeEach
  void reset() {
    sql.execute("TRUNCATE identity.users,identity.webhook_receipts,operations.jobs CASCADE");
    when(provider.find(any()))
        .thenReturn(
            new IdentityLookup.Found(
                new ExternalProfile("person@example.test", "First", null, null, null)));
  }

  @AfterAll
  static void shutdown() {
    JWKS.stop(0);
  }

  /**
   * Signs controlled actor claims, allowing missing-client and machine-grant rejection scenarios.
   *
   * @param subject subject claim under test
   * @param client nullable authorized-party claim
   * @param grant nullable grant-type claim
   * @return the serialized test token
   */
  String token(String subject, String client, String grant) throws JOSEException {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer("https://tenant.example/")
            .audience("core")
            .subject(subject)
            .expirationTime(Date.from(Instant.now().plusSeconds(300)));
    if (client != null) claims.claim("azp", client);
    if (grant != null) claims.claim("gty", grant);
    var jwt =
        new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY.getKeyID()).build(),
            claims.build());
    jwt.sign(new RSASSASigner(KEY));
    return jwt.serialize();
  }

  /**
   * Creates a token for the supported canonical native-user fixture.
   *
   * @return a valid short-lived user credential
   */
  String user() throws JOSEException {
    return token("google-oauth2|person", "native-client", null);
  }

  /**
   * Calls the current-user resource through its real security chain.
   *
   * @param method HTTP method under test
   * @param token optional bearer credential
   * @return the unmodified HTTP response
   */
  HttpResponse<String> request(String method, String token)
      throws IOException, InterruptedException {
    var b =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v2/users/me"))
            .method(method, HttpRequest.BodyPublishers.noBody());
    if (token != null) b.header("Authorization", "Bearer " + token);
    try (var client = HttpClient.newHttpClient()) {
      return client.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }
  }

  @Test
  void identitySchemaFailureRemainsVisibleWhenTheQueueSchemaIsHealthy() {
    var identity = metrics.get("blockout.schema.ready").tag("schema", "identity").gauge();
    var operations = metrics.get("blockout.schema.ready").tag("schema", "operations").gauge();
    assertThat(identity.value()).isEqualTo(1);
    sql.execute(
        "ALTER TABLE identity.billing_bindings RENAME COLUMN customer_id TO missing_customer_id");
    try {
      assertThat(identity.value()).isZero();
      assertThat(operations.value()).isEqualTo(1);
    } finally {
      sql.execute(
          "ALTER TABLE identity.billing_bindings RENAME COLUMN missing_customer_id TO customer_id");
    }
  }

  @Test
  void createsThenReadsTheSameProfileWithoutProviderRefresh()
      throws IOException, InterruptedException, JOSEException {
    var created = request("POST", user());
    assertThat(created.statusCode()).isEqualTo(201);
    assertThat(created.headers().firstValue("location")).contains("/api/v2/users/me");
    var existing = request("POST", user());
    assertThat(existing.statusCode()).isEqualTo(200);
    assertThat(existing.body()).isEqualTo(created.body());
    var read = request("GET", user());
    assertThat(read.statusCode()).isEqualTo(200);
    assertThat(read.body()).isEqualTo(created.body());
    assertThat(read.headers().firstValue("cache-control").orElse("")).contains("no-store");
    var json = new JsonMapper().readTree(read.body());
    assertThat(UUID.fromString(json.path("id").asString())).isNotNull();
    assertThat(json.path("createdAt").asString()).endsWith("Z");
    assertThat(json.path("lastName").isNull()).isTrue();
    assertThat(read.body())
        .doesNotContain("google-oauth2|", "customerId", "clientSecret", "favorites");
    verify(provider, times(1)).find(any());
  }

  @Test
  void missingGetIsSideEffectFree() throws IOException, InterruptedException, JOSEException {
    var response = request("GET", user());
    assertThat(response.statusCode()).isEqualTo(404);
    assertThat(response.body()).contains("USER_NOT_FOUND");
    verifyNoInteractions(provider);
  }

  @Test
  void unsupportedMethodsReturnTheHttpContract()
      throws IOException, InterruptedException, JOSEException {
    var response = request("PUT", user());

    assertThat(response.statusCode()).isEqualTo(405);
    assertThat(new JsonMapper().readTree(response.body()).path("code").asString())
        .isEqualTo("METHOD_NOT_ALLOWED");
    assertThat(response.headers().firstValue("allow").orElse("")).contains("GET", "POST");
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsMissingAuthentication() throws IOException, InterruptedException {
    var response = request("POST", null);
    assertThat(response.statusCode()).isEqualTo(401);
    assertThat(new JsonMapper().readTree(response.body()).path("code").asString())
        .isEqualTo("AUTHENTICATION_REQUIRED");
    verifyNoInteractions(provider);
  }

  @Test
  void cookiesCannotAuthenticateProfileCreation()
      throws IOException, InterruptedException, JOSEException {
    var request =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v2/users/me"))
            .timeout(java.time.Duration.ofSeconds(10))
            .header("Cookie", "JSESSIONID=fixture; access_token=" + user())
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();

    try (var client = HttpClient.newHttpClient()) {
      var response = client.send(request, HttpResponse.BodyHandlers.ofString());

      assertThat(response.statusCode()).isEqualTo(401);
      verifyNoInteractions(provider);
    }
  }

  @Test
  void rejectsMachineIdentity() throws IOException, InterruptedException, JOSEException {
    assertThat(request("POST", token("machine@clients", "native-client", null)).statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsClientCredentialsGrant() throws IOException, InterruptedException, JOSEException {
    assertThat(
            request("POST", token("google-oauth2|person", "native-client", "client-credentials"))
                .statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsForeignNativeClient() throws IOException, InterruptedException, JOSEException {
    assertThat(request("POST", token("google-oauth2|person", "other", null)).statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsMissingClient() throws IOException, InterruptedException, JOSEException {
    assertThat(request("POST", token("google-oauth2|person", null, null)).statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @ParameterizedTest
  @CsvSource({
    "IDENTITY_PROVIDER_UNAVAILABLE, IDENTITY_PROVIDER_UNAVAILABLE",
    "IDENTITY_CONFIGURATION_ERROR, IDENTITY_CONFIGURATION_ERROR"
  })
  void returnsSafeProviderFailure(IdentityFailureReason reason, String expectedCode)
      throws IOException, InterruptedException, JOSEException {
    when(provider.find(any())).thenReturn(new IdentityLookup.Unavailable(reason));
    var response = request("POST", user());
    assertThat(response.statusCode()).isEqualTo(503);
    assertThat(new JsonMapper().readTree(response.body()).path("code").asString())
        .isEqualTo(expectedCode);
    assertThat(response.body()).doesNotContain("person@", "google-oauth2|", "exception");
    assertThat(response.headers().firstValue("content-type")).contains("application/problem+json");
    assertThat(response.headers().firstValue("retry-after")).isPresent();
  }

  @Test
  void rejectsMismatchedProviderIdentity() throws IOException, InterruptedException, JOSEException {
    when(provider.find(any())).thenReturn(new IdentityLookup.Mismatch());
    assertThat(request("POST", user()).statusCode()).isEqualTo(409);
  }

  @Test
  @org.junit.jupiter.api.extension.ExtendWith(
      org.springframework.boot.test.system.OutputCaptureExtension.class)
  void unexpectedFailuresNeverExposeProviderMessages(
      org.springframework.boot.test.system.CapturedOutput output)
      throws IOException, InterruptedException, JOSEException {
    when(provider.find(any()))
        .thenThrow(
            new IllegalStateException(
                "private@example.test synthetic-secret",
                new IllegalArgumentException("nested-secret")));
    var response = request("POST", user());
    assertThat(response.statusCode()).isEqualTo(500);
    assertThat(response.body())
        .contains("INTERNAL_ERROR")
        .doesNotContain("private@", "synthetic-secret", "IllegalStateException");
    assertThat(output.getAll())
        .contains("java.lang.IllegalStateException")
        .doesNotContain("private@example.test", "synthetic-secret", "nested-secret");
    var json = new JsonMapper();
    var event =
        output
            .getOut()
            .lines()
            .filter(line -> line.startsWith("{"))
            .map(json::readTree)
            .filter(
                node -> "api.request.failed".equals(node.path("event").path("action").asString()))
            .findFirst()
            .orElseThrow();
    assertThat(event.path("error").path("type").asString())
        .isEqualTo("java.lang.IllegalStateException");
    assertThat(event.path("error").has("message")).isFalse();
  }

  @Test
  void anotherUserCannotReadTheCreatedProfile()
      throws IOException, InterruptedException, JOSEException {
    request("POST", user());
    assertThat(request("GET", token("apple|other", "native-client", null)).statusCode())
        .isEqualTo(404);
  }

  @Test
  void refusesToReactivateAnInactiveProfile()
      throws IOException, InterruptedException, JOSEException {
    request("POST", user());
    sql.execute("UPDATE identity.users SET active=false");
    assertThat(request("POST", user()).statusCode()).isEqualTo(403);
    verify(provider, times(1)).find(any());
  }

  @Test
  void subscriptionConsultationIsLocalAndRefreshesCoalesce() throws Exception {
    request("POST", user());
    var first = subscriptionRequest("GET", "/api/v2/users/me/subscription", user(), null, null);
    assertThat(first.statusCode()).isEqualTo(200);
    assertThat(first.body()).contains("\"state\":\"unknown\"", "\"refreshState\":\"pending\"");
    assertThat(first.headers().firstValue("Cache-Control").orElseThrow())
        .contains("no-store", "private");
    var refresh =
        subscriptionRequest("POST", "/api/v2/users/me/subscription-refreshes", user(), null, null);
    subscriptionRequest("POST", "/api/v2/users/me/subscription-refreshes", user(), null, null);
    assertThat(refresh.statusCode()).isEqualTo(202);
    assertThat(refresh.headers().firstValue("Location")).contains("/api/v2/users/me/subscription");
    assertThat(refresh.headers().firstValue("Retry-After")).contains("30");
    assertThat(sql.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class)).isOne();
    verify(provider, times(1)).find(any());
  }

  @Test
  void subscriptionRequiresAnExistingNativeOwner() throws Exception {
    assertThat(
            subscriptionRequest("GET", "/api/v2/users/me/subscription", null, null, null)
                .statusCode())
        .isEqualTo(401);
    assertThat(
            subscriptionRequest("GET", "/api/v2/users/me/subscription", user(), null, null)
                .statusCode())
        .isEqualTo(404);
    assertThat(
            subscriptionRequest(
                    "GET",
                    "/api/v2/users/me/subscription",
                    token("machine@clients", "native-client", null),
                    null,
                    null)
                .statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void authenticatedWebhookCommitsOneReceiptAndNoUnknownProfile() throws Exception {
    String body =
        "{ \"event\": {\"id\":\"event-1\",\"type\":\"INITIAL_PURCHASE\",\"event_timestamp_ms\":1,\"environment\":\"PRODUCTION\",\"app_user_id\":\"unknown\"}}";
    String authorization = "Bearer fixture-webhook-secret";
    var first =
        subscriptionRequest("POST", "/api/v2/webhooks/revenuecat", null, body, authorization);
    var second =
        subscriptionRequest("POST", "/api/v2/webhooks/revenuecat", null, body, authorization);
    assertThat(first.statusCode()).isEqualTo(200);
    assertThat(second.statusCode()).isEqualTo(200);
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.webhook_receipts", Integer.class))
        .isOne();
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.users", Integer.class)).isZero();
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.NullAndEmptySource
  @org.junit.jupiter.params.provider.ValueSource(
      strings = {"Bearer wrong-secret", "fixture-webhook-secret"})
  void webhookRejectsInvalidCredentialsBeforeParsing(String authorization) throws Exception {
    var response =
        subscriptionRequest(
            "POST", "/api/v2/webhooks/revenuecat", null, "invalid-json", authorization);
    assertThat(response.statusCode()).isEqualTo(401);
    assertThat(response.body())
        .contains("WEBHOOK_AUTHENTICATION_FAILED")
        .doesNotContain("wrong-secret");
    assertThat(response.headers().firstValue("WWW-Authenticate")).isEmpty();
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.webhook_receipts", Integer.class))
        .isZero();
  }

  @Test
  void authenticatedWebhookStillRequiresTheGeneratedContract() throws Exception {
    String body = "{\"event\":{\"type\":\"TEST\"}}";
    assertThat(
            subscriptionRequest(
                    "POST",
                    "/api/v2/webhooks/revenuecat",
                    null,
                    body,
                    "Bearer fixture-webhook-secret")
                .statusCode())
        .isEqualTo(400);
  }

  /**
   * Sends a real request through native JWT or webhook-header authentication.
   *
   * @param method HTTP operation
   * @param path tested resource
   * @param token optional bearer credential
   * @param body optional original JSON bytes
   * @param authorization optional complete webhook Authorization value
   * @return received response
   */
  HttpResponse<String> subscriptionRequest(
      String method, String path, String token, String body, String authorization)
      throws IOException, InterruptedException {
    var builder =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .method(
                method,
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(body));
    if (token != null) builder.header("Authorization", "Bearer " + token);
    if (body != null) builder.header("Content-Type", "application/json");
    if (authorization != null) builder.setHeader("Authorization", authorization);
    try (var client = HttpClient.newHttpClient()) {
      return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
  }

  @Test
  void webhookCredentialIsIndependentOfNativeUserTokens() throws Exception {
    String body = "{\"event\":{\"id\":\"header-only\",\"type\":\"TEST\",\"event_timestamp_ms\":1}}";
    var response =
        subscriptionRequest(
            "POST", "/api/v2/webhooks/revenuecat", null, body, "Bearer fixture-webhook-secret");
    assertThat(response.statusCode()).isEqualTo(200);
    var rejected = subscriptionRequest("POST", "/api/v2/webhooks/revenuecat", user(), body, null);
    assertThat(rejected.statusCode()).isEqualTo(401);
    assertThat(rejected.body()).contains("WEBHOOK_AUTHENTICATION_FAILED");
    assertThat(
            subscriptionRequest(
                    "GET", "/api/v2/users/me/subscription", "fixture-webhook-secret", null, null)
                .statusCode())
        .isEqualTo(401);
  }
}
