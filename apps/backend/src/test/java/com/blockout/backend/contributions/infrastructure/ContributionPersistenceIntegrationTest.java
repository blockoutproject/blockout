package com.blockout.backend.contributions.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManager;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real migrated PostgreSQL invariants; SQL fixtures deliberately bypass application authorization.
 */
@SpringBootTest
@Testcontainers
@DisplayName("Contribution persistence baseline")
class ContributionPersistenceIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000010");
  private static final UUID NEXT_MATCH = UUID.fromString("00000000-0000-4000-8000-000000000011");
  private static final UUID FIRST = UUID.fromString("00000000-0000-4000-8000-000000000020");
  private static final UUID SECOND = UUID.fromString("00000000-0000-4000-8000-000000000021");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private ContributionStore store;
  @Autowired private ContributionPersistenceMapper mapper;
  @Autowired private EntityManager entityManager;
  @Autowired private PlatformTransactionManager transactions;

  /**
   * Applies the complete real baseline before Hibernate validation with restricted app credentials.
   *
   * @param properties native dynamic property registry
   * @throws Exception if migration fails
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Resets only this suite's disposable container and establishes real F02/F05 FK targets.
   *
   * @throws Exception if isolated fixture setup fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute("TRUNCATE sporting_season, sporting_division, account CASCADE");
    }
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'one', 'first', 'one@example.invalid'), (?, 'https://identity.example.invalid/', 'two', 'second', 'two@example.invalid')",
        OWNER,
        OTHER);
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES ('00000000-0000-4000-8000-000000000030', 2026, '2026/2027')");
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES ('00000000-0000-4000-8000-000000000031', 'Synthetic', TRUE, '#112233')");
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000030', 'LNV', 'synthetic', 'pack')");
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name) VALUES ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000032', 'LNV', 'synthetic', 'competition', 'pool', 'Synthetic pool')");
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES ('00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000030', 'LNV', 'synthetic', 'competition', 'home', 'Home', 'home', '00000000-0000-4000-8000-000000000031', '_6X6', 'MIXED'), ('00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000030', 'LNV', 'synthetic', 'competition', 'away', 'Away', 'away', '00000000-0000-4000-8000-000000000031', '_6X6', 'MIXED')");
    sql.update(
        "INSERT INTO sporting_match(id, pool_id, reference, home_team_id, away_team_id) VALUES (?, '00000000-0000-4000-8000-000000000033', 'one', '00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000035'), (?, '00000000-0000-4000-8000-000000000033', 'two', '00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000035')",
        MATCH,
        NEXT_MATCH);
  }

  @Test
  @DisplayName("Traverses active matches in bounded exclusive UUID batches")
  void pagesActiveMatchesByIdentity() {
    // Given
    sql.update(
        """
        INSERT INTO sporting_match(id, pool_id, reference, home_team_id, away_team_id)
        SELECT CAST('00000000-0000-4000-9000-' || LPAD(TO_HEX(n), 12, '0') AS UUID),
               pool_id, 'cursor-' || n, home_team_id, away_team_id
        FROM sporting_match CROSS JOIN GENERATE_SERIES(1, 101) n WHERE id = ?
        """,
        MATCH);
    sql.update(
        """
        INSERT INTO contribution_version(id, match_id, address, platform, owner_id, state, created_at, quota_participating)
        SELECT id, id, 'https://youtube.com/watch?v=cursor', 'YOUTUBE', ?, 'ACTIVE', ?, FALSE
        FROM sporting_match WHERE reference LIKE 'cursor-%'
        """,
        OWNER, Timestamp.from(NOW));
    insertVersion(FIRST, MATCH, OWNER, "PENDING", true, NOW);

    // When
    List<UUID> first = store.activeMatches(null);
    List<UUID> next = store.activeMatches(first.getLast());

    // Then
    assertThat(first).hasSize(100).isSorted().doesNotContain(MATCH);
    assertThat(next).containsExactly(UUID.fromString("00000000-0000-4000-9000-000000000065"));
    assertThat(store.activeMatches(next.getLast())).isEmpty();
  }

  @Test
  @DisplayName(
      "Allows active/pending coexistence while rejecting a second active regardless of owner")
  void enforcesOneActiveVersion() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "ACTIVE", true, NOW);
    insertVersion(SECOND, MATCH, OWNER, "PENDING", true, NOW);

    // When
    ThrowingCallable duplicate =
        () ->
            insertVersion(
                UUID.fromString("00000000-0000-4000-8000-000000000022"),
                MATCH,
                OTHER,
                "ACTIVE",
                false,
                NOW);

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_contribution_active");
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE match_id = ?", Long.class, MATCH))
        .isEqualTo(2L);
  }

  @Test
  @DisplayName(
      "Allows distinct owners' pending proposals and rejects one owner's second pending proposal")
  void enforcesPendingOwnership() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "PENDING", true, NOW);
    insertVersion(SECOND, MATCH, OTHER, "PENDING", true, NOW);

    // When
    ThrowingCallable duplicate =
        () ->
            insertVersion(
                UUID.fromString("00000000-0000-4000-8000-000000000022"),
                MATCH,
                OWNER,
                "PENDING",
                true,
                NOW);

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("uk_contribution_pending_owner");
  }

  @Test
  @DisplayName(
      "Retains distinct ownerless pending proposals when their account references are removed")
  void permitsOwnerlessPendingVersions() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "PENDING", true, NOW);
    insertVersion(SECOND, MATCH, OTHER, "PENDING", true, NOW);

    // When
    sql.update("DELETE FROM account WHERE id IN (?, ?)", OWNER, OTHER);

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE owner_id IS NULL AND state = 'PENDING'",
                Long.class))
        .isEqualTo(2L);
    assertThat(
            sql.queryForList("SELECT quota_participating FROM contribution_version", Boolean.class))
        .containsExactly(true, true);
  }

  @ParameterizedTest
  @ValueSource(strings = {"source_version_id", "replaced_by_version_id"})
  @DisplayName("Rejects cross-match source and replacement references at the database boundary")
  void enforcesSameMatchLineage(String column) {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "REJECTED", true, NOW);
    insertVersion(SECOND, NEXT_MATCH, OTHER, "ACTIVE", false, NOW);

    // When
    ThrowingCallable crossMatch =
        () ->
            sql.update(
                "UPDATE contribution_version SET " + column + " = ? WHERE id = ?", SECOND, FIRST);

    // Then
    assertThatThrownBy(crossMatch).isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("Rejects an unresolved hold referring to another match's version")
  void enforcesSameMatchHold() {
    // Given
    insertVersion(FIRST, NEXT_MATCH, OTHER, "HIDDEN", true, NOW);
    sql.update("INSERT INTO contribution_state(match_id, revision) VALUES (?, 4)", MATCH);

    // When
    ThrowingCallable crossMatch =
        () ->
            sql.update(
                "UPDATE contribution_state SET report_hold_version_id = ? WHERE match_id = ?",
                FIRST,
                MATCH);

    // Then
    assertThatThrownBy(crossMatch)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("fk_contribution_hold_match");
  }

  @Test
  @DisplayName("Retains same-match lineage and the exact unresolved hidden version")
  void retainsValidLineage() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "HIDDEN", true, NOW);
    insertVersion(SECOND, MATCH, null, "ACTIVE", false, NOW.plusSeconds(1));

    // When
    sql.update("UPDATE contribution_version SET source_version_id = ? WHERE id = ?", FIRST, SECOND);
    sql.update(
        "UPDATE contribution_version SET replaced_by_version_id = ? WHERE id = ?", SECOND, FIRST);
    sql.update(
        "INSERT INTO contribution_state(match_id, revision, report_hold_version_id) VALUES (?, 8, ?)",
        MATCH,
        FIRST);

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT report_hold_version_id FROM contribution_state WHERE match_id = ?",
                UUID.class,
                MATCH))
        .isEqualTo(FIRST);
    assertThat(
            sql.queryForObject(
                "SELECT source_version_id FROM contribution_version WHERE id = ?",
                UUID.class,
                SECOND))
        .isEqualTo(FIRST);
    assertThatThrownBy(
            () ->
                sql.update(
                    "INSERT INTO contribution_state(match_id, revision) VALUES (?, 0)", MATCH))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("Rejects version and state rows referring to unknown F02 or F05 identities")
  void enforcesExternalOwners() {
    // Given
    UUID absent = UUID.fromString("00000000-0000-4000-8000-000000000099");

    // When
    ThrowingCallable missingMatch = () -> insertVersion(FIRST, absent, OWNER, "PENDING", true, NOW);
    ThrowingCallable missingAccount =
        () -> insertVersion(FIRST, MATCH, absent, "PENDING", true, NOW);
    ThrowingCallable missingStateMatch =
        () ->
            sql.update("INSERT INTO contribution_state(match_id, revision) VALUES (?, 0)", absent);

    // Then
    assertThatThrownBy(missingMatch).isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(missingAccount).isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(missingStateMatch).isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("Rejects a negative editing revision")
  void enforcesNonnegativeRevision() {
    // When
    ThrowingCallable negative =
        () ->
            sql.update("INSERT INTO contribution_state(match_id, revision) VALUES (?, -1)", MATCH);

    // Then
    assertThatThrownBy(negative)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("ck_contribution_revision");
  }

  @ParameterizedTest
  @ValueSource(strings = {"publication", "decision"})
  @DisplayName("Rejects incomplete decision facts while permitting erased actor attribution")
  void enforcesCompleteDecisionFacts(String fact) {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "PENDING", true, NOW);

    // When
    ThrowingCallable missingTime =
        () ->
            sql.update(
                "UPDATE contribution_version SET " + fact + "_kind = 'APPROVAL' WHERE id = ?",
                FIRST);
    ThrowingCallable missingKind =
        () ->
            sql.update(
                "UPDATE contribution_version SET " + fact + "_actor_id = ? WHERE id = ?",
                OWNER,
                FIRST);

    // Then
    assertThatThrownBy(missingTime)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("ck_contribution_" + fact + "_fact");
    assertThatThrownBy(missingKind)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("ck_contribution_" + fact + "_fact");
  }

  @Test
  @DisplayName(
      "Maps immutable literals, source/replacement and distinct publication/later-decision facts through real JPA")
  void mapsVersionFacts() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "HIDDEN", true, NOW.minusSeconds(1));
    insertVersion(SECOND, MATCH, OTHER, "ACTIVE", false, NOW);
    String literal = "HTTPS://YouTube.COM/a/../watch?v=A%2fb#Original";
    ContributionVersionEntity entity =
        new ContributionVersionEntity(
            MATCH,
            new StreamAddress(literal),
            OWNER,
            ContributionVersion.State.WITHDRAWN,
            NOW,
            false,
            FIRST);
    entity.setPublicationKind(ContributionVersion.DecisionKind.REACTIVATION);
    entity.setPublicationAt(NOW);
    entity.setPublicationActorId(OTHER);
    entity.setDecisionKind(ContributionVersion.DecisionKind.WITHDRAWAL);
    entity.setDecisionAt(NOW.plusSeconds(2));
    entity.setDecisionActorId(OWNER);
    entity.setReplacedByVersionId(SECOND);

    // When
    ContributionVersion result =
        new TransactionTemplate(transactions)
            .execute(
                status -> {
                  entityManager.persist(entity);
                  entityManager.flush();
                  entityManager.clear();
                  return mapper.toVersion(
                      entityManager.find(ContributionVersionEntity.class, entity.getId()));
                });

    // Then
    assertThat(result.id()).isEqualTo(entity.getId());
    assertThat(result.matchId()).isEqualTo(MATCH);
    assertThat(result.ownerId()).isEqualTo(OWNER);
    assertThat(result.address().value()).isEqualTo(literal);
    assertThat(result.address().platform()).isEqualTo(StreamAddress.Platform.YOUTUBE);
    assertThat(result.state()).isEqualTo(ContributionVersion.State.WITHDRAWN);
    assertThat(result.createdAt()).isEqualTo(NOW);
    assertThat(result.quotaParticipating()).isFalse();
    assertThat(result.sourceVersionId()).isEqualTo(FIRST);
    assertThat(result.replacedByVersionId()).isEqualTo(SECOND);
    assertThat(result.publication())
        .isEqualTo(
            new ContributionVersion.Decision(
                ContributionVersion.DecisionKind.REACTIVATION, NOW, OTHER));
    assertThat(result.decision())
        .isEqualTo(
            new ContributionVersion.Decision(
                ContributionVersion.DecisionKind.WITHDRAWAL, NOW.plusSeconds(2), OWNER));
    assertThat(
            sql.queryForObject(
                "SELECT platform FROM contribution_version WHERE id = ?",
                String.class,
                entity.getId()))
        .isEqualTo("YOUTUBE");
  }

  @Test
  @DisplayName("Maps an ownerless pending version without inventing decisions")
  void mapsAbsentAttributionAndDecisions() {
    // Given
    insertVersion(FIRST, MATCH, null, "PENDING", true, NOW);

    // When
    ContributionVersion result =
        new TransactionTemplate(transactions)
            .execute(
                status ->
                    mapper.toVersion(entityManager.find(ContributionVersionEntity.class, FIRST)));

    // Then
    assertThat(result.ownerId()).isNull();
    assertThat(result.publication()).isNull();
    assertThat(result.decision()).isNull();
    assertThat(result.quotaParticipating()).isTrue();
  }

  @Test
  @DisplayName("Maps initial and edited match state without creating a row on the initial read")
  void mapsMatchState() {
    // Given
    ContributionState initial = ContributionState.initial(MATCH);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM contribution_state", Long.class)).isZero();
    insertVersion(FIRST, MATCH, OWNER, "HIDDEN", true, NOW);
    MatchContributionStateEntity entity = new MatchContributionStateEntity(MATCH);
    entity.setRevision(7);
    entity.setReportHoldVersionId(FIRST);

    // When
    ContributionState result =
        new TransactionTemplate(transactions)
            .execute(
                status -> {
                  entityManager.persist(entity);
                  entityManager.flush();
                  entityManager.clear();
                  return mapper.toState(
                      entityManager.find(MatchContributionStateEntity.class, MATCH));
                });

    // Then
    assertThat(initial).isEqualTo(new ContributionState(MATCH, 0, null));
    assertThat(result).isEqualTo(new ContributionState(MATCH, 7, FIRST));
  }

  @Test
  @DisplayName(
      "Preserves useful publication and later decision facts after nullable actor attribution is removed")
  void preservesDecisionsAfterAttributionRemoval() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "HIDDEN", true, NOW);
    sql.update(
        "UPDATE contribution_version SET publication_kind = 'APPROVAL', publication_at = ?, publication_actor_id = ?, decision_kind = 'HIDING', decision_at = ?, decision_actor_id = ? WHERE id = ?",
        Timestamp.from(NOW),
        OTHER,
        Timestamp.from(NOW.plusSeconds(1)),
        OWNER,
        FIRST);
    sql.update(
        "INSERT INTO contribution_state(match_id, revision, report_hold_version_id) VALUES (?, 4, ?)",
        MATCH,
        FIRST);

    // When
    sql.update("DELETE FROM account WHERE id IN (?, ?)", OWNER, OTHER);
    ContributionVersion result =
        new TransactionTemplate(transactions)
            .execute(
                status ->
                    mapper.toVersion(entityManager.find(ContributionVersionEntity.class, FIRST)));

    // Then
    assertThat(result.ownerId()).isNull();
    assertThat(result.publication())
        .isEqualTo(
            new ContributionVersion.Decision(ContributionVersion.DecisionKind.APPROVAL, NOW, null));
    assertThat(result.decision())
        .isEqualTo(
            new ContributionVersion.Decision(
                ContributionVersion.DecisionKind.HIDING, NOW.plusSeconds(1), null));
    assertThat(result.quotaParticipating()).isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT report_hold_version_id FROM contribution_state WHERE match_id = ?",
                UUID.class,
                MATCH))
        .isEqualTo(FIRST);
    assertThat(
            sql.queryForObject(
                "SELECT revision FROM contribution_state WHERE match_id = ?", Long.class, MATCH))
        .isEqualTo(4L);
  }

  @Test
  @DisplayName("Flushes old states before inserting replacement active and pending versions")
  void supportsJpaReplacementOrdering() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "ACTIVE", true, NOW);
    insertVersion(SECOND, MATCH, OWNER, "PENDING", true, NOW);

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              entityManager
                  .find(ContributionVersionEntity.class, FIRST)
                  .setState(ContributionVersion.State.REPLACED);
              entityManager
                  .find(ContributionVersionEntity.class, SECOND)
                  .setState(ContributionVersion.State.SUPERSEDED);
              entityManager.flush();
              entityManager.persist(
                  new ContributionVersionEntity(
                      MATCH,
                      new StreamAddress("https://twitch.tv/new"),
                      OWNER,
                      ContributionVersion.State.ACTIVE,
                      NOW.plusSeconds(1),
                      true,
                      null));
              entityManager.persist(
                  new ContributionVersionEntity(
                      MATCH,
                      new StreamAddress("https://facebook.com/new"),
                      OWNER,
                      ContributionVersion.State.PENDING,
                      NOW.plusSeconds(2),
                      true,
                      null));
            });

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE state = 'ACTIVE'", Long.class))
        .isEqualTo(1L);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE state = 'PENDING'", Long.class))
        .isEqualTo(1L);
    assertThat(store.usage(OWNER, MATCH, ContributionQuota.dayAt(NOW)).versionsUsed())
        .isEqualTo(4L);
  }

  @Test
  @DisplayName("Returns zero usage before the first participating submission")
  void readsUnusedQuota() {
    // Given
    ContributionQuota.Day day = ContributionQuota.dayAt(NOW);

    // When
    ContributionQuota.Usage usage = store.usage(OWNER, MATCH, day);

    // Then
    assertThat(usage).isEqualTo(new ContributionQuota.Usage(0, 0, false));
  }

  @ParameterizedTest
  @CsvSource({"2026-03-29T10:00:00Z", "2026-10-25T10:00:00Z"})
  @DisplayName(
      "Derives daily usage from participating rows at both DST boundaries with inclusive/exclusive midnight")
  void aggregatesParisDays(Instant now) {
    // Given
    ContributionQuota.Day day = ContributionQuota.dayAt(now);
    insertVersion(FIRST, MATCH, OWNER, "REJECTED", true, day.startsAt().minusSeconds(1));
    insertVersion(SECOND, MATCH, OWNER, "CANCELLED", true, day.startsAt());
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000022"),
        NEXT_MATCH,
        OWNER,
        "HIDDEN",
        true,
        day.endsAt().minusSeconds(1));
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000023"),
        NEXT_MATCH,
        OWNER,
        "WITHDRAWN",
        true,
        day.endsAt());
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000024"),
        MATCH,
        OWNER,
        "REPLACED",
        false,
        now);
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000025"),
        NEXT_MATCH,
        OTHER,
        "SUPERSEDED",
        true,
        now);

    // When
    ContributionQuota.Usage usage = store.usage(OWNER, MATCH, day);

    // Then
    assertThat(usage).isEqualTo(new ContributionQuota.Usage(2, 2, true));
    assertThat(store.usage(OWNER, NEXT_MATCH, ContributionQuota.dayAt(day.endsAt())))
        .isEqualTo(new ContributionQuota.Usage(2, 1, true));
    assertThat(store.usage(OTHER, MATCH, day)).isEqualTo(new ContributionQuota.Usage(0, 1, false));
  }

  @Test
  @DisplayName(
      "Counts yesterday's match today and permits same-day continuation when three distinct matches are used")
  void countsPreviouslyContributedMatchAgain() {
    // Given
    UUID third = UUID.fromString("00000000-0000-4000-8000-000000000012");
    UUID fourth = UUID.fromString("00000000-0000-4000-8000-000000000013");
    sql.update(
        "INSERT INTO sporting_match(id, pool_id, reference, home_team_id, away_team_id) SELECT ?, pool_id, 'three', home_team_id, away_team_id FROM sporting_match WHERE id = ?",
        third,
        MATCH);
    sql.update(
        "INSERT INTO sporting_match(id, pool_id, reference, home_team_id, away_team_id) SELECT ?, pool_id, 'four', home_team_id, away_team_id FROM sporting_match WHERE id = ?",
        fourth,
        MATCH);
    ContributionQuota.Day day = ContributionQuota.dayAt(NOW);
    insertVersion(FIRST, fourth, OWNER, "REJECTED", true, day.startsAt().minusSeconds(1));
    insertVersion(SECOND, MATCH, OWNER, "CANCELLED", true, NOW);
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000022"),
        NEXT_MATCH,
        OWNER,
        "HIDDEN",
        true,
        NOW);
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000023"),
        third,
        OWNER,
        "WITHDRAWN",
        true,
        NOW);

    // When
    ContributionQuota.Usage newMatch = store.usage(OWNER, fourth, day);
    ContributionQuota.Usage continuation = store.usage(OWNER, MATCH, day);

    // Then
    assertThat(newMatch).isEqualTo(new ContributionQuota.Usage(1, 3, false));
    assertThat(ContributionQuota.limit(newMatch))
        .isEqualTo(ContributionQuota.Limit.DAILY_MATCH_LIMIT);
    assertThat(continuation).isEqualTo(new ContributionQuota.Usage(1, 3, true));
    assertThat(ContributionQuota.limit(continuation)).isEqualTo(ContributionQuota.Limit.AVAILABLE);
  }

  @Test
  @DisplayName(
      "Keeps ordinary quota participation after approval, rejection, cancellation and later grant changes")
  void retainsCreationParticipation() {
    // Given
    insertVersion(FIRST, MATCH, OWNER, "PENDING", true, NOW);
    insertVersion(SECOND, MATCH, OWNER, "REJECTED", true, NOW);
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000022"),
        MATCH,
        OWNER,
        "CANCELLED",
        true,
        NOW);
    insertVersion(
        UUID.fromString("00000000-0000-4000-8000-000000000023"),
        MATCH,
        OWNER,
        "WITHDRAWN",
        false,
        NOW);
    ContributionQuota.Day day = ContributionQuota.dayAt(NOW);
    ContributionQuota.Usage before = store.usage(OWNER, MATCH, day);

    // When
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'stream-links.moderate')",
        OWNER);
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              ContributionVersionEntity pending =
                  entityManager.find(ContributionVersionEntity.class, FIRST);
              pending.setState(ContributionVersion.State.ACTIVE);
              pending.setPublicationKind(ContributionVersion.DecisionKind.APPROVAL);
              pending.setPublicationAt(NOW.plusSeconds(1));
              pending.setPublicationActorId(OTHER);
            });
    ContributionQuota.Usage after = store.usage(OWNER, MATCH, day);

    // Then
    assertThat(before).isEqualTo(new ContributionQuota.Usage(3, 1, true));
    assertThat(after).isEqualTo(before);
    assertThat(ContributionQuota.limit(after)).isEqualTo(ContributionQuota.Limit.VERSION_LIMIT);
    assertThat(store.usage(OWNER, MATCH, ContributionQuota.dayAt(day.endsAt())))
        .isEqualTo(new ContributionQuota.Usage(3, 0, false));
  }

  /**
   * Writes one explicit fixture through the restricted role, exercising actual schema invariants.
   *
   * @param id stable version identity
   * @param match F02 match owner
   * @param owner nullable account attribution
   * @param state explicit lifecycle for the scenario
   * @param participating immutable ordinary quota flag
   * @param created creation instant
   */
  private void insertVersion(
      UUID id, UUID match, UUID owner, String state, boolean participating, Instant created) {
    sql.update(
        "INSERT INTO contribution_version(id, match_id, address, platform, owner_id, state, created_at, quota_participating) VALUES (?, ?, 'https://youtube.com/watch?v=one', 'YOUTUBE', ?, ?, ?, ?)",
        id,
        match,
        owner,
        state,
        Timestamp.from(created),
        participating);
  }
}
