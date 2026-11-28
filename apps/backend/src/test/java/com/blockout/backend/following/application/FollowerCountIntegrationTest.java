package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Actual relation lifecycle and current sporting visibility on migrated, disposable PostgreSQL. */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
@Transactional
@DisplayName("Direct public follower counts on PostgreSQL")
class FollowerCountIntegrationTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000227");
  @Autowired private JdbcTemplate sql;
  @Autowired private jakarta.persistence.EntityManager entities;
  @Autowired private ReadFollowerCount counts;
  @Autowired private FollowState states;

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Counts existing relations once through repeat, remove and re-follow")
  void directRelations(TargetType type) {
    // Given
    account();
    UUID pool = sporting(2026);
    UUID id = pool;
    Target target = new Target(type, id);
    FollowContext first = new FollowContext(ACCOUNT, target);
    UUID other = UUID.fromString("00000000-0000-4000-8000-000000000228");
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'other-count', 'Other', 'other@example.invalid')",
        other);
    assertThat(counts.read(target)).isZero();
    states.replace(first, true);
    states.replace(first, true);
    states.replace(new FollowContext(other, target), true);
    Target opposite = new Target(type == TargetType.TEAM ? TargetType.POOL : TargetType.TEAM, id);
    states.replace(new FollowContext(ACCOUNT, opposite), true);
    UUID anotherPool = sporting(2027);
    states.replace(new FollowContext(ACCOUNT, new Target(TargetType.POOL, anotherPool)), true);

    // When
    long repeated = counts.read(target);
    states.replace(first, false);
    states.replace(first, false);
    long removed = counts.read(target);
    states.replace(first, true);
    long followedAgain = counts.read(target);

    // Then
    assertThat(repeated).isEqualTo(2L);
    assertThat(counts.read(opposite)).isEqualTo(1L);
    assertThat(removed).isEqualTo(1L);
    assertThat(followedAgain).isEqualTo(2L);
    assertThat(counts.read(new Target(TargetType.POOL, anotherPool))).isEqualTo(1L);
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Hides and restores the target without changing its underlying relations")
  void hiddenTarget(TargetType type) {
    // Given
    account();
    UUID pool = sporting(2026);
    UUID id = pool;
    Target target = new Target(type, id);
    states.replace(new FollowContext(ACCOUNT, target), true);
    entities.flush();
    sql.update("UPDATE sporting_pool SET calendar_empty = TRUE WHERE id = ?", pool);

    // When / Then
    assertThatThrownBy(() -> counts.read(target))
        .isInstanceOf(FollowUnavailableTargetException.class);
    String table = type == TargetType.TEAM ? "team_follow" : "pool_follow";
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM " + table, Long.class)).isEqualTo(1L);

    // When
    sql.update("UPDATE sporting_pool SET calendar_empty = FALSE WHERE id = ?", pool);
    long restored = counts.read(target);

    // Then
    assertThat(restored).isEqualTo(1L);
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Does not turn an unknown target into a zero count")
  void missingTarget(TargetType type) {
    // Given
    Target target = new Target(type, UUID.fromString("00000000-0000-4000-8000-000000000299"));

    // When / Then
    assertThatThrownBy(() -> counts.read(target))
        .isInstanceOf(FollowUnavailableTargetException.class);
  }

  /** Creates the original synthetic owner in the rollback-isolated database transaction. */
  private void account() {
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'count-owner', 'CountOwner', 'count@example.invalid')",
        ACCOUNT);
  }

  /**
   * Creates independent team/pool identities that deliberately share a UUID in one sporting season.
   *
   * @param year scenario's sporting start year
   * @return typed team/pool UUID with current eligible participation
   */
  private UUID sporting(long year) {
    UUID id = UUID.fromString("00000000-0000-4000-8000-" + String.format("%012d", year));
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, ?, ?)",
        id,
        year,
        year + "/" + (year + 1));
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, ?, TRUE, '#112233')",
        id,
        "Synthetic " + year);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', 'pack')",
        id,
        id);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', 'pool', 'Synthetic pool', ?, '_6X6', 'MIXED')",
        id,
        id,
        id,
        id);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', 'team', 'Synthetic team', 'synthetic', ?, '_6X6', 'MIXED')",
        id,
        id,
        id);
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        id,
        id,
        id);
    return id;
  }
}
