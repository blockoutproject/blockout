package com.blockout.backend.api.sports.api;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;

import com.blockout.backend.api.ApiApplication;
import java.net.URI;
import java.net.http.*;
import java.sql.*;
import java.time.Instant;
import java.util.UUID;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises real HTTP, MVC validation and local roles; JWT cryptography is covered by security
 * tests.
 */
@SpringBootTest(
    classes = ApiApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "management.server.port=0",
      "blockout.auth.issuer=https://tenant.example/",
      "blockout.auth.audience=core",
      "blockout.auth.jwk-set-uri=https://tenant.example/jwks",
      "blockout.revenuecat.webhook.authorization=Bearer fixture-secret",
      "blockout.identity.native-client-ids=native-client",
      "blockout.identity.auth0.base-url=https://tenant.example",
      "blockout.identity.auth0.client-id=fixture",
      "blockout.identity.auth0.client-secret=fixture",
      "blockout.identity.billing.project-id=project",
      "blockout.identity.billing.environment=production",
      "blockout.ffvb.scraper.client-ids=scraper"
    })
@Testcontainers
class FfvbAdministrationIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  @AutoClose static final ClassLoaderResourceAccessor RESOURCES = new ClassLoaderResourceAccessor();
  static final UUID USER = UUID.fromString("62d286df-c07b-4e99-906e-e50b80ee2e7a");
  @Autowired JdbcTemplate sql;
  @MockitoBean JwtDecoder decoder;
  @LocalServerPort int port;

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry properties) {
    properties.add("spring.datasource.url", DB::getJdbcUrl);
    properties.add("spring.datasource.username", DB::getUsername);
    properties.add("spring.datasource.password", DB::getPassword);
  }

  @BeforeAll
  static void migrate() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
        Statement statement = connection.createStatement()) {
      statement.execute(
          "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE SCHEMA sports; CREATE ROLE blockout_api; CREATE ROLE blockout_worker");
      try (JdbcConnection jdbc = new JdbcConnection(connection);
          Liquibase lb = new Liquibase("db/changelog/db.changelog-master.xml", RESOURCES, jdbc)) {
        lb.update("");
      }
    }
  }

  @BeforeEach
  void reset() {
    sql.execute(
        "TRUNCATE identity.users, operations.jobs, sports.divisions, sports.ffvb_sources CASCADE");
    sql.update("INSERT INTO sports.ffvb_configuration(id,enabled) VALUES (1,false)");
    sql.update(
        "INSERT INTO identity.users(id,pseudo,pseudo_key,active,created_at,updated_at) VALUES (?,'admin','admin',true,now(),now())",
        USER);
    sql.update(
        "INSERT INTO identity.external_identities(issuer,subject,user_id) VALUES ('https://tenant.example/','auth0|admin',?)",
        USER);
    when(decoder.decode("admin"))
        .thenReturn(jwt("auth0|admin", "native-client", "authorization_code", ""));
    when(decoder.decode("machine"))
        .thenReturn(
            jwt("scraper@clients", "scraper", "client-credentials", "read:ffvb-configuration"));
    when(decoder.decode("wrong-client"))
        .thenReturn(jwt("other@clients", "other", "client-credentials", "read:ffvb-configuration"));
    when(decoder.decode("no-scope"))
        .thenReturn(jwt("scraper@clients", "scraper", "client-credentials", ""));
  }

  @Test
  void revokedRoleStopsTheNextRequest() throws Exception {
    assertThat(request("GET", "/admin/ffvb/configuration", "admin", null).statusCode())
        .isEqualTo(403);
    grant();
    assertThat(request("GET", "/admin/ffvb/configuration", "admin", null).statusCode())
        .isEqualTo(200);
    sql.update("DELETE FROM identity.user_roles WHERE user_id=?", USER);
    assertThat(request("GET", "/admin/ffvb/configuration", "admin", null).statusCode())
        .isEqualTo(403);
  }

  @Test
  void inactiveAdministratorCannotConfigureCollection() throws Exception {
    grant();
    sql.update("UPDATE identity.users SET active=false WHERE id=?", USER);
    assertThat(request("GET", "/admin/ffvb/configuration", "admin", null).statusCode())
        .isEqualTo(403);
  }

  @Test
  void writesValidatedExplicitConfigurationWithAudit() throws Exception {
    grant();
    HttpResponse<String> response =
        request(
            "PUT",
            "/admin/ffvb/configuration",
            "admin",
            "{\"enabled\":true,\"season\":\"2026/2027\",\"sources\":[\"ABCCS\",\"LIAQ\"]}");
    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.headers().firstValue("Cache-Control").orElseThrow())
        .contains("private", "no-store");
    assertThat(response.body()).contains("2026/2027", "ABCCS", "updatedAt");
    assertThat(sql.queryForObject("SELECT updated_by FROM sports.ffvb_configuration", UUID.class))
        .isEqualTo(USER);
    assertThat(sql.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class)).isZero();
    assertThat(request("GET", "/admin/ffvb/configuration", "admin", null).statusCode())
        .isEqualTo(200);
    assertThat(sql.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class)).isZero();
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(
      strings = {
        "{\"enabled\":true,\"season\":null,\"sources\":[\"ABCCS\"]}",
        "{\"enabled\":true,\"season\":\"2026/2028\",\"sources\":[\"ABCCS\"]}",
        "{\"enabled\":true,\"season\":\"2026/2027\",\"sources\":[]}",
        "{\"enabled\":true,\"season\":\"2026/2027\",\"sources\":[\"LIRE\"]}",
        "{\"enabled\":true,\"season\":\"invalid\",\"sources\":[\"ABCCS\"]}"
      })
  void rejectsInvalidConfigurationWithoutChangingState(String body) throws Exception {
    grant();
    assertThat(request("PUT", "/admin/ffvb/configuration", "admin", body).statusCode())
        .isEqualTo(400);
    assertThat(sql.queryForObject("SELECT enabled FROM sports.ffvb_configuration", Boolean.class))
        .isFalse();
  }

  @Test
  void divisionsHaveStableIdsAndExplicitConflicts() throws Exception {
    grant();
    HttpResponse<String> created =
        request("POST", "/admin/divisions", "admin", "{\"name\":\"Regional\",\"active\":true}");
    assertThat(created.statusCode()).isEqualTo(201);
    String id = JsonMapper.builder().build().readTree(created.body()).get("id").asText();
    assertThat(created.headers().firstValue("Location").orElseThrow()).endsWith(id);
    assertThat(
            request("POST", "/admin/divisions", "admin", "{\"name\":\"Regional\",\"active\":true}")
                .statusCode())
        .isEqualTo(409);
    assertThat(
            request(
                    "PUT",
                    "/admin/divisions/" + id,
                    "admin",
                    "{\"name\":\"Regional renamed\",\"active\":false}")
                .body())
        .contains(id, "Regional renamed");
    assertThat(request("GET", "/admin/divisions?pageSize=101", "admin", null).statusCode())
        .isEqualTo(400);
    assertThat(
            request(
                    "PUT",
                    "/admin/divisions/" + UUID.randomUUID(),
                    "admin",
                    "{\"name\":\"Other\",\"active\":true}")
                .statusCode())
        .isEqualTo(404);
  }

  @Test
  void onlyExplicitActiveMappingsReachTheScraper() throws Exception {
    grant();
    UUID division = UUID.randomUUID();
    UUID mapping = UUID.randomUUID();
    sql.update("INSERT INTO sports.divisions(id,name,active) VALUES (?,'Regional',true)", division);
    sql.update(
        "INSERT INTO sports.ffvb_mappings(id,organizer,label) VALUES (?,'LIAQ','Provider label')",
        mapping);
    assertThat(request("GET", "/admin/ffvb/mappings?mapped=false", "admin", null).body())
        .contains("Provider label");
    assertThat(request("GET", "/imports/ffvb/mappings", "machine", null).body())
        .doesNotContain("Provider label");
    HttpResponse<String> mapped =
        request(
            "PUT",
            "/admin/ffvb/mappings/" + mapping,
            "admin",
            "{\"divisionId\":\"" + division + "\",\"format\":\"SIX\",\"gender\":\"F\"}");
    assertThat(mapped.statusCode()).isEqualTo(200);
    assertThat(request("GET", "/imports/ffvb/mappings", "machine", null).body())
        .contains("Provider label", "SIX");
    sql.update("UPDATE sports.divisions SET active=false WHERE id=?", division);
    assertThat(request("GET", "/imports/ffvb/mappings", "machine", null).body())
        .doesNotContain("Provider label");
    assertThat(
            request(
                    "PUT",
                    "/admin/ffvb/mappings/" + mapping,
                    "admin",
                    "{\"divisionId\":\"" + division + "\",\"format\":\"SIX\",\"gender\":\"F\"}")
                .statusCode())
        .isEqualTo(409);
  }

  @Test
  void machineReadsRequireTheDedicatedClientAndScope() throws Exception {
    assertThat(request("GET", "/imports/ffvb/configuration", null, null).statusCode())
        .isEqualTo(401);
    for (String credential : java.util.List.of("admin", "wrong-client", "no-scope")) {
      assertThat(request("GET", "/imports/ffvb/configuration", credential, null).statusCode())
          .isEqualTo(403);
    }
    assertThat(request("GET", "/imports/ffvb/configuration", "machine", null).statusCode())
        .isEqualTo(200);
    assertThat(request("GET", "/admin/ffvb/configuration", "machine", null).statusCode())
        .isEqualTo(403);
  }

  @Test
  void storageFailuresReturnASafeRetryableSportsProblem() throws Exception {
    grant();
    sql.execute("ALTER TABLE sports.ffvb_sources RENAME TO missing_sources");
    try {
      HttpResponse<String> response = request("GET", "/admin/ffvb/configuration", "admin", null);
      assertThat(response.statusCode()).isEqualTo(503);
      assertThat(response.body())
          .contains("SPORTS_STORE_UNAVAILABLE")
          .doesNotContain("SELECT", "missing_sources");
      assertThat(response.headers().firstValue("Retry-After").orElseThrow()).isEqualTo("5");
    } finally {
      sql.execute("ALTER TABLE sports.missing_sources RENAME TO ffvb_sources");
    }
  }

  @Test
  void rejectsBlankDivisionNamesAtTheGeneratedBoundary() throws Exception {
    grant();
    assertThat(
            request("POST", "/admin/divisions", "admin", "{\"name\":\"   \",\"active\":true}")
                .statusCode())
        .isEqualTo(400);
    assertThat(sql.queryForObject("SELECT count(*) FROM sports.divisions", Integer.class)).isZero();
  }

  /** Grants only the role being exercised; production uses the operations command. */
  private void grant() {
    sql.update("INSERT INTO identity.user_roles(user_id,role) VALUES (?,'ADMIN')", USER);
  }

  /** Constructs provider-validated claims without retesting the existing JWT cryptography. */
  private static Jwt jwt(String subject, String client, String grant, String scope) {
    return Jwt.withTokenValue("fixture")
        .header("alg", "RS256")
        .issuer("https://tenant.example/")
        .subject(subject)
        .issuedAt(Instant.now())
        .expiresAt(Instant.now().plusSeconds(300))
        .claim("azp", client)
        .claim("gty", grant)
        .claim("scope", scope)
        .build();
  }

  /**
   * Sends real HTTP through Spring Security, generated interface validation and owner transactions.
   */
  private HttpResponse<String> request(String method, String path, String token, String body)
      throws Exception {
    HttpRequest.Builder request =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v2" + path))
            .method(
                method,
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (body != null) request.header("Content-Type", "application/json");
    try (HttpClient client = HttpClient.newHttpClient()) {
      return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
  }
}
