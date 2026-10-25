package com.blockout.backend.collection.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Qualifies generated preparation handlers under real F12 admission, current SQL grants and
 * committed application transactions. Only the validated JWT and source evidence are synthetic; no
 * provider, native client or minimum-version qualification is implied.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Source preparation under current maintenance")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SourcePreparationMaintenanceIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000166");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000167");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000168");
  private static final UUID QUALIFIED = UUID.fromString("00000000-0000-4000-8000-000000000169");
  private static final String URL =
      "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=ABCCS";
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate sql;

  /**
   * Resets this disposable database to active maintenance and independently preparable sources.
   * Evidence is inserted explicitly to isolate admission from collector/provider qualification.
   *
   * @throws Exception if fixture cleanup cannot reach the suite's disposable database
   */
  @BeforeEach
  void prepare() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement cleanup = connection.createStatement()) {
      cleanup.execute("TRUNCATE collection_cycle, sporting_season, account CASCADE");
    }
    sql.update(
        "UPDATE access_settings SET active=true, revision=3, message='Pause en cours', image_url=NULL WHERE id='maintenance'");
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'auth0|166', 'Operator_166', 'operator@example.invalid')",
        ACCOUNT);
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, 2026, '2026/2027')", SEASON);
    sql.update(
        "INSERT INTO collection_source_binding(id, season_id, provider, organizer_reference, candidate_url, locked, launched, validation_state) VALUES (?, ?, 'FFVB', 'ABCCS', ?, FALSE, FALSE, 'CONFIRMATION_REQUIRED'), (?, ?, 'FFVB', 'LIRA', ?, FALSE, FALSE, 'QUALIFIED')",
        SOURCE,
        SEASON,
        URL,
        QUALIFIED,
        SEASON,
        "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIRA");
  }

  @ParameterizedTest(name = "{0} {1}")
  @MethodSource("preparationOperations")
  @DisplayName(
      "Current collection permission admits each preparation route without personal bypass")
  void admitsCollectionOperations(HttpMethod method, String path, String body, int expectedStatus)
      throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);

    // When
    mvc.perform(
            request(method, path)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().is(expectedStatus))
        .andExpect(header().string("Cache-Control", "no-store"));
    assertThat(
            sql.queryForObject(
                "SELECT active FROM access_settings WHERE id='maintenance'", Boolean.class))
        .isTrue();
    assertThat(
            sql.queryForList(
                "SELECT permission FROM account_permission WHERE account_id=?",
                String.class,
                ACCOUNT))
        .containsExactly("collection.manage");
  }

  @ParameterizedTest(name = "{0} {1}")
  @MethodSource("preparationOperations")
  @DisplayName("Guests cannot use the operational maintenance exception")
  void refusesGuests(HttpMethod method, String path, String body, int expectedStatus)
      throws Exception {
    // Given / When
    mvc.perform(request(method, path).contentType(MediaType.APPLICATION_JSON).content(body))
        // Then
        .andExpect(status().isUnauthorized());
    assertUnchangedPreparation();
  }

  @ParameterizedTest(name = "{0} {1}")
  @MethodSource("preparationOperations")
  @DisplayName("A mobile bearer alone grants no preparation access during maintenance")
  void refusesOrdinaryMembers(HttpMethod method, String path, String body, int expectedStatus)
      throws Exception {
    // Given / When
    mvc.perform(
            request(method, path)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
    assertUnchangedPreparation();
  }

  @ParameterizedTest(name = "{0} {1}")
  @MethodSource("preparationOperations")
  @DisplayName(
      "Other operational, sporting, moderation and bypass grants confer no collection access")
  void refusesInheritedPermissions(HttpMethod method, String path, String body, int expectedStatus)
      throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) SELECT ?, unnest(ARRAY['maintenance.manage', 'application-versions.manage', 'maintenance.bypass', 'sporting-presentation.manage', 'sporting-classification.manage', 'division-lifecycle.manage', 'stream-links.moderate'])",
        ACCOUNT);

    // When
    mvc.perform(
            request(method, path)
                .with(mobile())
                .header("Blockout-Maintenance-Bypass", "true")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isForbidden());
    assertUnchangedPreparation();
  }

  @ParameterizedTest(name = "{0} {1}")
  @MethodSource("preparationOperations")
  @DisplayName("Revocation after an admitted read forbids the next preparation operation")
  void rechecksCollectionPermission(HttpMethod method, String path, String body, int expectedStatus)
      throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);
    mvc.perform(get("/administration/source-bindings/{id}", SOURCE).with(mobile()))
        .andExpect(status().isOk());
    sql.update("DELETE FROM account_permission WHERE account_id=?", ACCOUNT);

    // When
    mvc.perform(
            request(method, path)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isForbidden());
    assertUnchangedPreparation();
  }

  @ParameterizedTest(name = "{0} {1}")
  @MethodSource("preparationOperations")
  @DisplayName("An erased account cannot reuse its previously admitted mobile principal")
  void requiresCurrentAccount(HttpMethod method, String path, String body, int expectedStatus)
      throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);
    mvc.perform(get("/administration/source-bindings/{id}", SOURCE).with(mobile()))
        .andExpect(status().isOk());
    sql.update("DELETE FROM account WHERE id=?", ACCOUNT);

    // When
    mvc.perform(
            request(method, path)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        // Then
        .andExpect(status().isForbidden());
    assertUnchangedPreparation();
  }

  @Test
  @DisplayName("Collection access leaves ordinary business reads blocked by current maintenance")
  void keepsOrdinaryAccessBlocked() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);
    mvc.perform(get("/administration/source-bindings/{id}", SOURCE).with(mobile()))
        .andExpect(status().isOk());

    // When
    mvc.perform(get("/clubs").with(mobile()))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"))
        .andExpect(jsonPath("$.maintenance.active").value(true))
        .andExpect(jsonPath("$.maintenance.revision").value(3))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().doesNotExist("Retry-After"));
  }

  @Test
  @DisplayName("Explicit personal bypass still requires its own current grant")
  void refusesImplicitBypass() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        ACCOUNT);

    // When
    mvc.perform(get("/clubs").with(mobile()).header("Blockout-Maintenance-Bypass", "true"))
        // Then
        .andExpect(status().isForbidden());
    assertUnchangedPreparation();
  }

  /**
   * Checks persisted effects of rejected commands, including revisions and newly created bindings.
   */
  private void assertUnchangedPreparation() {
    assertThat(sql.queryForObject("SELECT count(*) FROM collection_source_binding", Long.class))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM collection_source_binding WHERE revision<>0 OR locked OR launched OR season_confirmed OR current_cycle_id IS NOT NULL",
                Long.class))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT candidate_url FROM collection_source_binding WHERE id=?",
                String.class,
                SOURCE))
        .isEqualTo(URL);
    assertThat(
            sql.queryForObject(
                "SELECT collection_revision FROM sporting_season WHERE id=?", Long.class, SEASON))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM collection_control WHERE season_id IS NOT NULL", Long.class))
        .isZero();
  }

  /** Supplies a validated synthetic principal; business grants always come from PostgreSQL. */
  private static RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("auth0|166")
                    .claim("azp", "mobile-test"));
  }

  /**
   * Lists valid generated requests so admission refusals cannot be attributed to malformed input.
   *
   * @return every source-preparation method/resource, with its domain-valid success status
   */
  private static Stream<Arguments> preparationOperations() {
    String seasonPath = "/administration/collection-seasons/" + SEASON;
    String sourcePath = "/administration/source-bindings/" + SOURCE;
    return Stream.of(
        Arguments.of(HttpMethod.GET, "/administration/collection-seasons", "", 200),
        Arguments.of(HttpMethod.GET, seasonPath, "", 200),
        Arguments.of(HttpMethod.GET, seasonPath + "/source-bindings", "", 200),
        Arguments.of(HttpMethod.GET, sourcePath, "", 200),
        Arguments.of(HttpMethod.GET, sourcePath + "/children", "", 200),
        Arguments.of(
            HttpMethod.POST,
            seasonPath + "/source-bindings",
            """
            {"seasonRevision":0,"provider":"ffvb","organizerReference":"PTCA06","candidateUrl":"https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=PTCA06"}
            """,
            201),
        Arguments.of(
            HttpMethod.PUT,
            sourcePath + "/candidate",
            "{\"revision\":0,\"candidateUrl\":\"" + URL + "&saison=2026/2027\"}",
            200),
        Arguments.of(HttpMethod.POST, sourcePath + "/validations", "{\"revision\":0}", 202),
        Arguments.of(
            HttpMethod.PUT,
            sourcePath + "/season-confirmation",
            "{\"revision\":0,\"seasonLabel\":\"2026/2027\"}",
            200),
        Arguments.of(
            HttpMethod.POST,
            seasonPath + "/source-launches",
            "{\"revision\":0,\"sourceBindingIds\":[\"" + QUALIFIED + "\"]}",
            200));
  }
}
