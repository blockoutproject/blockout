package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.blockout.backend.search.application.SearchEngine.Candidate;
import com.blockout.backend.search.application.SearchEngine.Position;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real migrated PostgreSQL and F02/F03 reads; engine cities are deliberate stale inputs. The F03
 * spy records forbidden detail reads while executing the real owner projections.
 */
@SpringBootTest
@Testcontainers
@DisplayName("Current search hydration")
class SearchCurrentDataIntegrationTest {
  @Container static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @Autowired JdbcTemplate sql;
  @Autowired HydrateSearch hydration;
  @MockitoSpyBean ReadSportingResources consultation;

  /**
   * Applies the actual baseline before Hibernate validation with the restricted application role.
   *
   * @param properties native registry for this suite's disposable database settings
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Clears only this suite's disposable database before each independent fixture. */
  @org.junit.jupiter.api.BeforeEach
  void clearFixtures() throws Exception {
    try (java.sql.Connection connection =
            java.sql.DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        java.sql.Statement statement = connection.createStatement()) {
      statement.execute("TRUNCATE sporting_season, sporting_club, sporting_division CASCADE");
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"corrected", "absent", "restricted"})
  @DisplayName("Omits a stale city even when the resource name matches")
  void omitsStaleCity(String change) {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) VALUES (?, 'FFVB', ?, 'Eagles', 'Lyon')",
        id,
        id.toString());
    switch (change) {
      case "corrected" ->
          sql.update(
              "UPDATE sporting_club SET municipality_mode = 'MANUAL', municipality_manual = 'Paris' WHERE id = ?",
              id);
      case "absent" ->
          sql.update("UPDATE sporting_club SET municipality_mode = 'HIDDEN' WHERE id = ?", id);
      case "restricted" ->
          sql.update("UPDATE sporting_club SET municipality_restricted = TRUE WHERE id = ?", id);
      default -> throw new IllegalArgumentException();
    }
    SearchContext context =
        new SearchContext(SearchContext.Resource.CLUB, "eagles", null, null, null, null, false);

    // When
    java.util.Map<UUID, SearchPage.Summary> current =
        hydration.current(context, List.of(new Candidate(new Position(1.0, id), "Lyon")));

    // Then
    assertThat(current).isEmpty();
  }

  @Test
  @DisplayName("Returns the current public identity and logo of a club without teams")
  void hydratesCurrentClub() {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, manual_name, municipality, logo, logo_media_type) VALUES (?, 'FFVB', ?, 'Old source', 'Current Eagles', 'Lyon', ?, 'image/png')",
        id,
        id.toString(),
        new byte[] {1});
    SearchContext context =
        new SearchContext(SearchContext.Resource.CLUB, "old", null, null, null, null, false);

    // When
    SearchPage.Club club =
        hydration
            .current(context, List.of(new Candidate(new Position(1.0, id), "Lyon")))
            .get(id)
            .club();

    // Then
    assertThat(club.club().id()).isEqualTo(id);
    assertThat(club.club().name()).isEqualTo("Current Eagles");
    assertThat(club.club().logoUrl()).isEqualTo("/clubs/" + id + "/logo");
    assertThat(club.city()).isEqualTo("Lyon");
    verify(consultation, never()).club(id);
  }

  @ParameterizedTest
  @ValueSource(ints = {2018, 2040})
  @DisplayName("Preserves clubless professional identity across published past and future seasons")
  void hydratesProfessionalTeam(int year) {
    // Given
    Fixture fixture = professionalTeam(year);
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.TEAM,
            "eagles",
            fixture.season(),
            fixture.division(),
            com.blockout.backend.generated.mobile.model.SportFormatEnum._6X6,
            com.blockout.backend.generated.mobile.model.SportGenderEnum.FEMALE,
            false);

    // When
    SearchPage.Summary summary =
        hydration
            .current(context, List.of(new Candidate(new Position(1.0, fixture.team()), null)))
            .get(fixture.team());

    // Then
    assertThat(summary.team().team().id()).isEqualTo(fixture.team());
    assertThat(summary.team().season().startYear()).isEqualTo(year);
    assertThat(summary.team().professional()).isTrue();
    assertThat(summary.team().club()).isNull();
    verify(consultation, never()).team(fixture.team());
  }

  @ParameterizedTest
  @ValueSource(strings = {"participation", "division", "pool"})
  @DisplayName("Current sporting restrictions remove teams and affected pool reads")
  void respectsCurrentRestrictions(String restriction) {
    // Given
    Fixture fixture = professionalTeam(2026);
    switch (restriction) {
      case "participation" ->
          sql.update(
              "UPDATE sporting_participation SET current = FALSE WHERE team_id = ?",
              fixture.team());
      case "division" ->
          sql.update(
              "UPDATE sporting_division SET active = FALSE WHERE id = ?", fixture.division());
      case "pool" ->
          sql.update(
              "UPDATE sporting_pool SET catalog_eligible = FALSE WHERE id = ?", fixture.pool());
      default -> throw new IllegalArgumentException();
    }
    SearchContext context =
        new SearchContext(SearchContext.Resource.TEAM, "eagles", null, null, null, null, false);

    // When
    java.util.Map<UUID, SearchPage.Summary> result =
        hydration.current(context, List.of(new Candidate(new Position(1.0, fixture.team()), null)));

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Rechecks exact filters against current classification")
  void respectsCurrentFilter() {
    // Given
    Fixture fixture = professionalTeam(2026);
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.TEAM,
            "eagles",
            fixture.season(),
            fixture.division(),
            null,
            com.blockout.backend.generated.mobile.model.SportGenderEnum.MALE,
            false);

    // When
    java.util.Map<UUID, SearchPage.Summary> result =
        hydration.current(context, List.of(new Candidate(new Position(1.0, fixture.team()), null)));

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("A verified club attachment supplies current context without changing team identity")
  void attachesClub() {
    // Given
    Fixture fixture = professionalTeam(2026);
    UUID club = UUID.fromString("00000000-0000-4000-8000-000000000060");
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) VALUES (?, 'FFVB', ?, 'Club Eagles', 'Lyon')",
        club,
        club.toString());
    sql.update("UPDATE sporting_team SET club_id = ? WHERE id = ?", club, fixture.team());
    SearchContext context =
        new SearchContext(SearchContext.Resource.TEAM, "eagles", null, null, null, null, false);

    // When
    java.util.Map<UUID, SearchPage.Summary> stale =
        hydration.current(context, List.of(new Candidate(new Position(1.0, fixture.team()), null)));
    SearchPage.Summary current =
        hydration
            .current(context, List.of(new Candidate(new Position(1.0, fixture.team()), "Lyon")))
            .get(fixture.team());

    // Then
    assertThat(stale).isEmpty();
    assertThat(current.team().team().id()).isEqualTo(fixture.team());
    assertThat(current.team().club().id()).isEqualTo(club);
  }

  @Test
  @DisplayName("An unknown current pool classification cannot satisfy a stale exact filter")
  void omitsUnknownClassification() {
    // Given
    Fixture fixture = professionalTeam(2026);
    sql.update(
        "UPDATE sporting_pool SET format = NULL, gender = NULL WHERE id = ?", fixture.pool());
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.POOL,
            "synthetic",
            fixture.season(),
            fixture.division(),
            com.blockout.backend.generated.mobile.model.SportFormatEnum._6X6,
            null,
            false);

    // When
    java.util.Map<UUID, SearchPage.Summary> result =
        hydration.current(context, List.of(new Candidate(new Position(1.0, fixture.pool()), null)));

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Preserves unknown current pool classification when no exact filter is requested")
  void hydratesUnknownClassification() {
    // Given
    Fixture fixture = professionalTeam(2026);
    sql.update(
        "UPDATE sporting_pool SET format = NULL, gender = NULL WHERE id = ?", fixture.pool());
    SearchContext context =
        new SearchContext(SearchContext.Resource.POOL, "synthetic", null, null, null, null, false);

    // When
    SearchPage.Summary result =
        hydration
            .current(context, List.of(new Candidate(new Position(1.0, fixture.pool()), null)))
            .get(fixture.pool());

    // Then
    assertThat(result.pool().pool().id()).isEqualTo(fixture.pool());
    assertThat(result.pool().classification().format()).isNull();
    assertThat(result.pool().classification().gender()).isNull();
  }

  /**
   * Creates one viewable professional team and pool under explicit sporting year and
   * classification.
   *
   * @param year canonical sporting start year used by this scenario
   * @return stable identities of the current synthetic participation graph
   */
  private Fixture professionalTeam(int year) {
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000010");
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000020");
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000030");
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000040");
    UUID team = UUID.fromString("00000000-0000-4000-8000-000000000050");
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, ?, ?)",
        season,
        year,
        year + "/" + (year + 1));
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, ?, TRUE, '#112233')",
        division,
        "Synthetic " + division);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', ?)",
        pack,
        season,
        pack.toString());
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', ?, 'Synthetic pool', ?, '_6X6', 'FEMALE')",
        pool,
        season,
        pack,
        pool.toString(),
        division);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', ?, 'Eagles', 'eagles', ?, '_6X6', 'FEMALE')",
        team,
        season,
        team.toString(),
        division);
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        UUID.fromString("00000000-0000-4000-8000-000000000070"),
        team,
        pool);
    return new Fixture(team, pool, division, season);
  }

  /** Explicit identities of the synthetic current participation graph. */
  private record Fixture(UUID team, UUID pool, UUID division, UUID season) {}
}
