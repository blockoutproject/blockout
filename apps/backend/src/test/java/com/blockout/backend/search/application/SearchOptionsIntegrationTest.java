package com.blockout.backend.search.application;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real migrated PostgreSQL, F02 viewability and generated HTTP mapping; no search engine is used.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Current sporting search options")
class SearchOptionsIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private MockMvc mvc;

  /** Clears only this context's disposable sporting graph using the test migration role. */
  @BeforeEach
  void clearFixtures() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement statement = connection.createStatement()) {
      statement.execute("TRUNCATE sporting_season, sporting_club, sporting_division CASCADE");
    }
  }

  @Test
  @DisplayName("Successful absence retains canonical format and gender choices")
  void readsEmptyOptions() throws Exception {
    // Given: no current sporting resources.

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seasons").isEmpty())
        .andExpect(jsonPath("$.divisions").isEmpty())
        .andExpect(jsonPath("$.formats").value(contains("6x6", "4x4", "2x2")))
        .andExpect(jsonPath("$.genders").value(contains("female", "male", "mixed")));
  }

  @Test
  @DisplayName(
      "Team and pool seasons derive independently from viewable resources, including future history")
  void readsSeparateSeasons() throws Exception {
    // Given
    season(10, 2018);
    season(11, 2026);
    season(12, 2040);
    division(20, "Nationale", true);
    pool(30, 10, 20);
    pool(31, 11, 20);
    pool(32, 12, 20);
    team(40, 10, 20, 30);
    team(41, 12, 20, 32);
    sql.update("UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", id(10));

    // When
    ResultActions teams =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team"));
    ResultActions pools =
        mvc.perform(get("/sporting-search-options").param("resourceType", "pool"));

    // Then
    teams
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.seasons[*].id").value(contains(id(12).toString(), id(10).toString())));
    pools
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seasons[*].startYear").value(contains(2040, 2026, 2018)));
  }

  @ParameterizedTest
  @ValueSource(strings = {"participation", "pool", "calendar", "division"})
  @DisplayName(
      "Current restrictions remove ineligible team seasons without consulting projected facets")
  void removesRestrictedSeasons(String restriction) throws Exception {
    // Given
    season(10, 2040);
    division(20, "Nationale", true);
    pool(30, 10, 20);
    team(40, 10, 20, 30);
    switch (restriction) {
      case "participation" -> sql.update("UPDATE sporting_participation SET current = FALSE");
      case "pool" -> sql.update("UPDATE sporting_pool SET catalog_eligible = FALSE");
      case "calendar" -> sql.update("UPDATE sporting_pool SET calendar_empty = TRUE");
      case "division" -> sql.update("UPDATE sporting_division SET active = FALSE");
      default -> throw new IllegalArgumentException();
    }

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team"));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.seasons").isEmpty());
  }

  @Test
  @DisplayName(
      "Active divisions retain effective names and stable name UUID order even without matches")
  void readsActiveDivisions() throws Exception {
    // Given
    division(23, "zeta", true);
    division(22, "Bravo", true);
    division(21, "alpha", true);
    division(20, "Hidden", false);
    sql.update("UPDATE sporting_division SET name = 'Beta' WHERE id = ?", id(23));

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", "pool"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.divisions[*].id")
                .value(contains(id(21).toString(), id(23).toString(), id(22).toString())))
        .andExpect(jsonPath("$.divisions[*].name").value(contains("alpha", "Beta", "Bravo")))
        .andExpect(jsonPath("$.seasons").isEmpty());
  }

  /**
   * Supplies stable synthetic identities without provider references.
   *
   * @param suffix unique fixture suffix
   * @return scenario-owned UUID
   */
  private static UUID id(long suffix) {
    return UUID.fromString("00000000-0000-4000-8000-%012d".formatted(suffix));
  }

  /**
   * Creates one explicit sporting start year, independent from the wall clock.
   *
   * @param suffix season identity suffix
   * @param year canonical start year
   */
  private void season(long suffix, int year) {
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, ?, ?)",
        id(suffix),
        year,
        year + "/" + (year + 1));
  }

  /**
   * Creates the scenario's effective division without image payloads.
   *
   * @param suffix division identity suffix
   * @param name effective current name
   * @param active current visibility decision
   */
  private void division(long suffix, String name, boolean active) {
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, ?, ?, '#112233')",
        id(suffix),
        name,
        active);
  }

  /**
   * Seeds a currently published pool with an independent pack in the chosen season.
   *
   * @param suffix pool identity suffix
   * @param season season identity suffix
   * @param division accepted classification suffix
   */
  private void pool(long suffix, long season, long division) {
    UUID pack = id(suffix + 100);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', ?)",
        pack,
        id(season),
        pack.toString());
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', ?, 'Synthetic pool', ?, '_6X6', 'FEMALE')",
        id(suffix),
        id(season),
        pack,
        id(suffix).toString(),
        id(division));
  }

  /**
   * Seeds an eligible clubless professional team and its explicit current participation.
   *
   * @param suffix team identity suffix
   * @param season season identity suffix
   * @param division accepted classification suffix
   * @param pool current participation suffix
   */
  private void team(long suffix, long season, long division, long pool) {
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', ?, 'Synthetic team', 'synthetic team', ?, '_6X6', 'FEMALE')",
        id(suffix),
        id(season),
        id(suffix).toString(),
        id(division));
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        id(suffix + 200),
        id(suffix),
        id(pool));
  }
}
