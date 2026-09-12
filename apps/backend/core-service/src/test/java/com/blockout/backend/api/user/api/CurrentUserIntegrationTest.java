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
import java.net.*;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "management.server.port=0",
      "blockout.identity.native-client-ids=native-client",
      "blockout.identity.auth0.base-url=https://tenant.example",
      "blockout.identity.auth0.client-id=fixture",
      "blockout.identity.auth0.client-secret=fixture",
      "blockout.identity.billing.project-id=project",
      "blockout.identity.billing.environment=production"
    })
@Testcontainers
class CurrentUserIntegrationTest {
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
            ex.getResponseBody().write(body);
            ex.close();
          });
      JWKS.start();
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

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
  @MockitoBean UserIdentityProvider provider;
  @LocalServerPort int port;

  @BeforeAll
  static void migrate() throws Exception {
    try (var c =
        java.sql.DriverManager.getConnection(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword())) {
      c.createStatement()
          .execute(
              "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE ROLE blockout_api; CREATE ROLE blockout_worker");
      try (var lb =
          new Liquibase(
              "db/changelog/db.changelog-master.xml",
              new ClassLoaderResourceAccessor(),
              new JdbcConnection(c))) {
        lb.update("");
      }
    }
  }

  @BeforeEach
  void reset() {
    sql.execute("TRUNCATE identity.users CASCADE");
    when(provider.find(any()))
        .thenReturn(
            new IdentityLookup.Found(
                new ExternalProfile("person@example.test", "First", null, null, null)));
  }

  @AfterAll
  static void shutdown() {
    JWKS.stop(0);
  }

  String token(String subject, String client, String grant) throws Exception {
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

  String user() throws Exception {
    return token("google-oauth2|person", "native-client", null);
  }

  HttpResponse<String> request(String method, String token) throws Exception {
    var b =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v2/users/me"))
            .method(method, HttpRequest.BodyPublishers.noBody());
    if (token != null) b.header("Authorization", "Bearer " + token);
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  @Test
  void createsThenReadsTheSameProfileWithoutProviderRefresh() throws Exception {
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
  void missingGetIsSideEffectFree() throws Exception {
    var response = request("GET", user());
    assertThat(response.statusCode()).isEqualTo(404);
    assertThat(response.body()).contains("USER_NOT_FOUND");
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsMissingAuthentication() throws Exception {
    assertThat(request("POST", null).statusCode()).isEqualTo(401);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsMachineIdentity() throws Exception {
    assertThat(request("POST", token("machine@clients", "native-client", null)).statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsClientCredentialsGrant() throws Exception {
    assertThat(
            request("POST", token("google-oauth2|person", "native-client", "client-credentials"))
                .statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsForeignNativeClient() throws Exception {
    assertThat(request("POST", token("google-oauth2|person", "other", null)).statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void rejectsMissingClient() throws Exception {
    assertThat(request("POST", token("google-oauth2|person", null, null)).statusCode())
        .isEqualTo(403);
    verifyNoInteractions(provider);
  }

  @Test
  void returnsSafeProviderFailure() throws Exception {
    when(provider.find(any()))
        .thenReturn(new IdentityLookup.Unavailable("IDENTITY_PROVIDER_UNAVAILABLE"));
    var response = request("POST", user());
    assertThat(response.statusCode()).isEqualTo(503);
    assertThat(response.body())
        .contains("IDENTITY_PROVIDER_UNAVAILABLE")
        .doesNotContain("person@", "google-oauth2|", "exception");
    assertThat(response.headers().firstValue("retry-after")).isPresent();
  }

  @Test
  void rejectsMismatchedProviderIdentity() throws Exception {
    when(provider.find(any())).thenReturn(new IdentityLookup.Mismatch());
    assertThat(request("POST", user()).statusCode()).isEqualTo(409);
  }

  @Test
  @org.junit.jupiter.api.extension.ExtendWith(
      org.springframework.boot.test.system.OutputCaptureExtension.class)
  void unexpectedFailuresNeverExposeProviderMessages(
      org.springframework.boot.test.system.CapturedOutput output) throws Exception {
    when(provider.find(any()))
        .thenThrow(new IllegalStateException("private@example.test synthetic-secret"));
    var response = request("POST", user());
    assertThat(response.statusCode()).isEqualTo(500);
    assertThat(response.body())
        .contains("INTERNAL_ERROR")
        .doesNotContain("private@", "synthetic-secret", "IllegalStateException");
    assertThat(output.getAll())
        .contains("java.lang.IllegalStateException")
        .doesNotContain("private@example.test", "synthetic-secret");
  }

  @Test
  void anotherUserCannotReadTheCreatedProfile() throws Exception {
    request("POST", user());
    assertThat(request("GET", token("apple|other", "native-client", null)).statusCode())
        .isEqualTo(404);
  }

  @Test
  void refusesToReactivateAnInactiveProfile() throws Exception {
    request("POST", user());
    sql.execute("UPDATE identity.users SET active=false");
    assertThat(request("POST", user()).statusCode()).isEqualTo(403);
    verify(provider, times(1)).find(any());
  }
}
