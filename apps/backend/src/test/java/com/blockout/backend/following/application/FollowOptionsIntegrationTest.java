package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Migrated PostgreSQL and real read use case; all persisted owners are synthetic and rolled back.
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
@Transactional
@DisplayName("Current personal season options on PostgreSQL")
class FollowOptionsIntegrationTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000226");
  @Autowired private JdbcTemplate sql;
  @Autowired private ReadFollowOptions reads;

  @Test
  @DisplayName(
      "Prefers the newest viewable followed season over a newer catalogue and deduplicates origins")
  void followedDefaultAndDistinctOptions() {
    // Given
    account();
    UUID oldPool = season(2024, true);
    sql.update(
        "UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", seasonId(oldPool));
    UUID followedPool = season(2025, true);
    UUID catalogPool = season(2026, true);
    UUID oldTeam = team(oldPool, true, true);
    UUID team = team(followedPool, true, true);
    follow("team", oldTeam);
    follow("team", team);
    follow("pool", followedPool);

    // When
    ReadFollowOptions.Options options = reads.read(ACCOUNT);

    // Then
    assertThat(options.seasons())
        .extracting(season -> season.startYear())
        .containsExactly(2026L, 2025L, 2024L);
    assertThat(options.defaultSeasonId()).isEqualTo(seasonId(followedPool));
    assertThat(options.seasons())
        .extracting(season -> season.id())
        .containsExactly(seasonId(catalogPool), seasonId(followedPool), seasonId(oldPool));
  }

  @Test
  @DisplayName("Excludes hidden-only follows and keeps an independently visible catalogue season")
  void visibilityAndPrivacy() {
    // Given
    account();
    UUID hidden = season(2024, false);
    UUID available = season(2022, true);
    UUID former = season(2021, true);
    UUID newer = season(2023, true);
    follow("pool", hidden);
    follow("team", team(hidden, true, true));
    follow("team", team(available, false, true));
    follow("team", team(former, true, false));

    // When
    ReadFollowOptions.Options options = reads.read(ACCOUNT);

    // Then
    assertThat(options.seasons())
        .extracting(season -> season.startYear())
        .containsExactly(2023L, 2022L, 2021L);
    assertThat(options.defaultSeasonId()).isEqualTo(seasonId(newer));
  }

  @Test
  @DisplayName("Another account's follows never choose this owner's default")
  void originalOwner() {
    // Given
    account();
    UUID older = season(2030, true);
    UUID newest = season(2031, true);
    UUID other = UUID.fromString("00000000-0000-4000-8000-000000000227");
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', ?, 'OtherSeasonOwner', 'other@example.invalid')",
        other,
        other.toString());
    sql.update(
        "INSERT INTO pool_follow(id, account_id, pool_id) VALUES (?, ?, ?)",
        fixtureId("other-pool-follow"),
        other,
        older);

    // When
    ReadFollowOptions.Options options = reads.read(ACCOUNT);

    // Then
    assertThat(options.defaultSeasonId()).isEqualTo(seasonId(newest));
  }

  @Test
  @DisplayName("Returns no invented year or default without any viewable sporting season")
  void emptyOptions() {
    // Given
    account();
    UUID hidden = season(2040, false);
    follow("pool", hidden);

    // When
    ReadFollowOptions.Options options = reads.read(ACCOUNT);

    // Then
    assertThat(options.seasons()).isEmpty();
    assertThat(options.defaultSeasonId()).isNull();
  }

  @Test
  @DisplayName("Does not resolve a replacement lifecycle for a missing original account")
  void missingOriginal() {
    // Given
    UUID missing = UUID.fromString("00000000-0000-4000-8000-000000000228");

    // When / Then
    assertThatThrownBy(() -> reads.read(missing)).isInstanceOf(AccountNotFoundException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"catalog", "classification", "unclassified"})
  @DisplayName("Current F02 restrictions hide even a retained pool follow")
  void currentPoolRestrictions(String restriction) {
    // Given
    account();
    UUID pool = season(2050, true);
    follow("pool", pool);
    switch (restriction) {
      case "catalog" ->
          sql.update("UPDATE sporting_pool SET catalog_eligible = FALSE WHERE id = ?", pool);
      case "classification" ->
          sql.update(
              "UPDATE sporting_division SET active = FALSE WHERE id = (SELECT division_id FROM sporting_pool WHERE id = ?)",
              pool);
      case "unclassified" ->
          sql.update("UPDATE sporting_pool SET division_id = NULL WHERE id = ?", pool);
      default -> throw new IllegalArgumentException("Unsupported test restriction");
    }

    // When
    ReadFollowOptions.Options options = reads.read(ACCOUNT);

    // Then
    assertThat(options.seasons()).isEmpty();
    assertThat(options.defaultSeasonId()).isNull();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM pool_follow WHERE account_id = ?", Long.class, ACCOUNT))
        .isEqualTo(1L);
  }

  /** Creates only the original synthetic owner in this rollback-isolated database transaction. */
  private void account() {
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'season-options', 'SeasonOwner', 'owner@example.invalid')",
        ACCOUNT);
  }

  /**
   * Creates a catalogued pool with its own canonical season and classification.
   *
   * @param year explicit sporting start year
   * @param visible whether its qualified calendar is nonempty
   * @return contextual pool identity
   */
  private UUID season(long year, boolean visible) {
    UUID season = fixtureId(year + "-season");
    UUID division = fixtureId(year + "-division");
    UUID pack = fixtureId(year + "-pack");
    UUID pool = fixtureId(year + "-pool");
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, ?, ?)",
        season,
        year,
        year + "/" + (year + 1));
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, ?, TRUE, '#112233')",
        division,
        division.toString());
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', 'pack')",
        pack,
        season);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender, calendar_empty) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', 'pool', 'Synthetic', ?, '_6X6', 'MIXED', ?)",
        pool,
        season,
        pack,
        division,
        !visible);
    return pool;
  }

  /**
   * Creates an exact seasonal team whose participation and classification can independently hide
   * it.
   *
   * @param pool existing pool in this scenario
   * @param active current division eligibility
   * @param current current participation
   * @return seasonal team identity
   */
  private UUID team(UUID pool, boolean active, boolean current) {
    UUID team = fixtureId(pool + "-team-" + active + "-" + current);
    UUID division = fixtureId(team + "-division");
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, ?, ?, '#112233')",
        division,
        division.toString(),
        active);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', ?, 'Synthetic', 'synthetic', ?, '_6X6', 'MIXED')",
        team,
        seasonId(pool),
        team.toString(),
        division);
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, ?)",
        fixtureId(team + "-participation"),
        team,
        pool,
        current);
    return team;
  }

  /**
   * Stores a synthetic original-account relation without invoking unrelated follow-write
   * qualification.
   *
   * @param type scenario's explicit team or pool table
   * @param target exact sporting identity
   */
  private void follow(String type, UUID target) {
    sql.update(
        "INSERT INTO " + type + "_follow(id, account_id, " + type + "_id) VALUES (?, ?, ?)",
        fixtureId(type + "-follow-" + target),
        ACCOUNT,
        target);
  }

  /**
   * Resolves a fixture pool's canonical sporting season for explicit outcome assertions.
   *
   * @param pool fixture pool
   * @return owning season identity
   */
  private UUID seasonId(UUID pool) {
    return sql.queryForObject("SELECT season_id FROM sporting_pool WHERE id = ?", UUID.class, pool);
  }

  /**
   * Keeps secondary persisted fixture identities stable without obscuring each scenario's decisive
   * year/visibility.
   *
   * @param name synthetic fixture role and scope
   * @return reproducible UUID independent of execution order
   */
  private UUID fixtureId(String name) {
    return UUID.nameUUIDFromBytes(name.getBytes(StandardCharsets.UTF_8));
  }
}
