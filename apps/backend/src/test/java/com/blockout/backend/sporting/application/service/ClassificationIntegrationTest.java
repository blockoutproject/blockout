package com.blockout.backend.sporting.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Exercises complete correction commits against the migrated PostgreSQL schema. */
@SpringBootTest
@Testcontainers
@DisplayName("Atomic sporting classification")
class ClassificationIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID ORIGINAL = UUID.fromString("00000000-0000-4000-8000-000000000010");
  private static final UUID TARGET = UUID.fromString("00000000-0000-4000-8000-000000000011");
  @Autowired private ClassificationService classifications;
  @Autowired private SportingIdentityService identities;
  @Autowired private SportingReadService reads;
  @Autowired private SeasonService seasons;
  @Autowired private AccountStore accounts;
  @Autowired private JdbcTemplate sql;
  @Autowired private SportingStore store;
  @Autowired private PlatformTransactionManager transactions;
  private UUID account;
  private UUID season;

  /**
   * Configures application-role access after the actual disposable migration.
   *
   * @param properties native test configuration registry
   * @throws Exception if the disposable baseline cannot be migrated
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Recreates synthetic owners and grants without any provider operation.
   *
   * @throws Exception if isolated fixture cleanup fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute(
          "TRUNCATE sporting_season, sporting_club, sporting_division, account CASCADE");
    }
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?, 'Original', TRUE, '#112233'), (?, 'Target', TRUE, '#445566')",
        ORIGINAL,
        TARGET);
    account =
        new TransactionTemplate(transactions)
            .execute(
                state ->
                    accounts
                        .create(
                            "https://identity.example.invalid/",
                            "auth0|classification",
                            "Operator_157",
                            "operator@example.invalid",
                            null)
                        .id());
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'sporting-classification.manage')",
        account);
    season = seasons.getOrCreate(2026L).id();
  }

  @Test
  @DisplayName(
      "Removes acquisition settings without erasing published identities or classification")
  void preservesPublishedClassification() {
    // Given
    PoolView pool = pool("A", "pack", ORIGINAL);
    MatchView match = match(pool, "Home", "Away");
    ClassificationView first = classifications.pool(account, pool.id());
    ClassificationView configured =
        classifications.setPool(account, pool.id(), first.revision(), classification(TARGET));

    // When
    ClassificationView removed =
        classifications.setPool(account, pool.id(), configured.revision(), null);

    // Then
    assertThat(removed.setting()).isNull();
    assertThat(removed.effective()).isNull();
    assertThat(reads.pool(pool.id()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.team(match.homeTeamId()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.match(match.id())).contains(match);
    assertThat(
            classifications
                .setPool(account, pool.id(), removed.revision(), classification(TARGET))
                .effective())
        .isEqualTo(classification(TARGET));
  }

  @Test
  @DisplayName(
      "Refuses the entire pack correction when one team has an incompatible outside participation")
  void refusesSharedParticipation() {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView second = pool("B", "pack", ORIGINAL);
    PoolView outside = pool("C", "other-pack", ORIGINAL);
    MatchView shared = match(first, "Shared", "First away");
    match(outside, "Shared", "Outside away");
    match(second, "Independent", "Second away");
    ClassificationView before = classifications.pack(account, first.packId());

    // When
    ThrowingCallable correction =
        () ->
            classifications.setPack(
                account, first.packId(), before.revision(), classification(TARGET));

    // Then
    assertThatThrownBy(correction)
        .isInstanceOfSatisfying(
            SportingConflictException.class,
            error ->
                assertThat(error.getResourceIds()).contains(outside.id(), shared.homeTeamId()));
    assertThat(classifications.pack(account, first.packId())).isEqualTo(before);
    assertThat(reads.pool(first.id()).orElseThrow().classification())
        .isEqualTo(classification(ORIGINAL));
    assertThat(reads.pool(second.id()).orElseThrow().classification())
        .isEqualTo(classification(ORIGINAL));
  }

  @Test
  @DisplayName("Rejects a target identity collision without merging teams or restoring acquisition")
  void refusesTargetCollision() {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView target = pool("B", "other-pack", TARGET);
    MatchView existing = match(target, "Home", "Away");
    match(first, "Home", "Away");
    ClassificationView before = classifications.pool(account, first.id());

    // When
    ThrowingCallable correction =
        () ->
            classifications.setPool(account, first.id(), before.revision(), classification(TARGET));

    // Then
    assertThatThrownBy(correction)
        .isInstanceOfSatisfying(
            SportingConflictException.class,
            error -> assertThat(error.getResourceIds()).contains(existing.homeTeamId()));
    assertThat(classifications.pool(account, first.id())).isEqualTo(before);
  }

  @ParameterizedTest
  @CsvSource({"beta, other-target", "other-original, alpha", "shared alias, shared alias"})
  @DisplayName("Refuses a correction that collides through a qualified alias")
  void refusesAliasCollision(String originalAlias, String targetAlias) {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView target = pool("B", "other-pack", TARGET);
    MatchView original = match(first, "Alpha", "First away");
    MatchView existing = match(target, "Beta", "Target away");
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'organizer', 'competition', ?), (?, ?, 'organizer', 'competition', ?)",
        original.homeTeamId(),
        season,
        originalAlias,
        existing.homeTeamId(),
        season,
        targetAlias);
    ClassificationView before = classifications.pool(account, first.id());

    // When
    ThrowingCallable correction =
        () ->
            classifications.setPool(account, first.id(), before.revision(), classification(TARGET));

    // Then
    assertThatThrownBy(correction)
        .isInstanceOfSatisfying(
            SportingConflictException.class,
            error ->
                assertThat(error.getResourceIds()).contains(existing.homeTeamId(), first.id()));
    assertThat(classifications.pool(account, first.id())).isEqualTo(before);
    assertThat(reads.team(original.homeTeamId()).orElseThrow().classification())
        .isEqualTo(classification(ORIGINAL));
    assertThat(reads.match(original.id())).contains(original);
    assertThat(reads.match(existing.id())).contains(existing);
  }

  @Test
  @DisplayName("Refuses the whole pack when two corrected teams would share a qualified alias")
  void refusesAliasesWithinCorrectedPack() {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView second = pool("B", "pack", TARGET);
    MatchView original = match(first, "Alpha", "First away");
    MatchView existing = match(second, "Beta", "Second away");
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'organizer', 'competition', 'shared alias'), (?, ?, 'organizer', 'competition', 'shared alias')",
        original.homeTeamId(),
        season,
        existing.homeTeamId(),
        season);
    ClassificationView before = classifications.pack(account, first.packId());

    // When
    ThrowingCallable correction =
        () ->
            classifications.setPack(
                account, first.packId(), before.revision(), classification(ORIGINAL));

    // Then
    assertThatThrownBy(correction)
        .isInstanceOfSatisfying(
            SportingConflictException.class,
            error ->
                assertThat(error.getResourceIds())
                    .contains(
                        original.homeTeamId(), existing.homeTeamId(), first.id(), second.id()));
    assertThat(classifications.pack(account, first.packId())).isEqualTo(before);
    assertThat(reads.pool(second.id()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.match(original.id())).contains(original);
    assertThat(reads.match(existing.id())).contains(existing);
  }

  @ParameterizedTest
  @CsvSource({"other-organizer, competition", "organizer, other-competition"})
  @DisplayName("Preserves aliases in distinct qualified contexts during correction")
  void preservesIndependentAliasContexts(String organizer, String competition) {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView target = pool("B", "other-pack", TARGET);
    MatchView original = match(first, "Alpha", "First away");
    MatchView existing = match(target, "Beta", "Target away");
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'organizer', 'competition', 'shared alias'), (?, ?, ?, ?, 'shared alias')",
        original.homeTeamId(),
        season,
        existing.homeTeamId(),
        season,
        organizer,
        competition);
    ClassificationView before = classifications.pool(account, first.id());

    // When
    classifications.setPool(account, first.id(), before.revision(), classification(TARGET));
    MatchView observed = match(first, "Shared alias", "First away");

    // Then
    assertThat(observed).isEqualTo(original);
    assertThat(reads.team(original.homeTeamId()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.match(existing.id())).contains(existing);
  }

  @ParameterizedTest
  @CsvSource({"0002, 2026", "0001, 2027"})
  @DisplayName("Keeps identical aliases independent across clubs or seasons after correction")
  void preservesIndependentAliasOwners(String otherClub, long otherStartYear) {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    MatchView original = match(first, "Alpha", "First away");
    UUID otherSeason = seasons.getOrCreate(otherStartYear).id();
    PoolView other =
        identities.establishPool(
            new PoolKey(
                CollectionProviderEnum.FFVB,
                otherSeason,
                "organizer",
                "competition",
                null,
                null,
                "B"),
            "other-pack",
            "Other pool",
            classification(TARGET));
    MatchView existing =
        identities.identifyMatch(
            other.id(),
            "M1",
            new TeamCandidate(null, "Beta", otherClub, null),
            new TeamCandidate(null, "Other away", "0009", null));
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'organizer', 'competition', 'shared alias'), (?, ?, 'organizer', 'competition', 'shared alias')",
        original.homeTeamId(),
        season,
        existing.homeTeamId(),
        otherSeason);
    ClassificationView before = classifications.pool(account, first.id());

    // When
    classifications.setPool(account, first.id(), before.revision(), classification(TARGET));
    MatchView observed = match(first, "Shared alias", "First away");

    // Then
    assertThat(observed).isEqualTo(original);
    assertThat(reads.team(original.homeTeamId()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.match(existing.id())).contains(existing);
  }

  @Test
  @DisplayName("Preserves a matching revision and rejects a stale no-op after an inherited change")
  void rejectsStaleNoOp() {
    // Given
    PoolView pool = pool("A", "pack", ORIGINAL);
    ClassificationView before = classifications.pool(account, pool.id());
    ClassificationView pack = classifications.pack(account, pool.packId());
    assertThat(classifications.setPool(account, pool.id(), before.revision(), null))
        .isEqualTo(before);
    classifications.setPack(account, pool.packId(), pack.revision(), classification(TARGET));

    // When
    ThrowingCallable stale =
        () -> classifications.setPool(account, pool.id(), before.revision(), null);

    // Then
    assertThatThrownBy(stale)
        .isInstanceOfSatisfying(
            SportingConflictException.class,
            error -> assertThat(error.getType()).isEqualTo("stale-revision"));
  }

  @Test
  @DisplayName("Corrects all inherited pools together while preserving an explicit pool override")
  void preservesOverride() {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView second = pool("B", "pack", ORIGINAL);
    PoolView override = pool("C", "pack", ORIGINAL);
    MatchView shared = match(first, "Shared", "First away");
    match(second, "Shared", "Second away");
    ClassificationView initial = classifications.pool(account, override.id());
    ClassificationView overridden =
        classifications.setPool(
            account, override.id(), initial.revision(), classification(ORIGINAL));
    ClassificationView pack = classifications.pack(account, first.packId());

    // When
    ClassificationView corrected =
        classifications.setPack(account, first.packId(), pack.revision(), classification(TARGET));

    // Then
    assertThat(corrected.effective()).isEqualTo(classification(TARGET));
    assertThat(reads.pool(first.id()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.pool(second.id()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(reads.team(shared.homeTeamId()).orElseThrow().classification())
        .isEqualTo(classification(TARGET));
    assertThat(classifications.pool(account, override.id())).isEqualTo(overridden);
    assertThat(
            classifications
                .setPool(account, override.id(), overridden.revision(), null)
                .effective())
        .isEqualTo(classification(TARGET));
  }

  @Test
  @DisplayName("Refuses duplicate target identities formed entirely within the corrected pack")
  void refusesNewInternalCollision() {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView second = pool("B", "pack", TARGET);
    match(first, "Same name", "First away");
    match(second, "Same name", "Second away");
    ClassificationView pack = classifications.pack(account, first.packId());
    SportingClassification changed =
        new SportingClassification(TARGET, SportFormatEnum._4X4, SportGenderEnum.MIXED);

    // When
    ThrowingCallable correction =
        () -> classifications.setPack(account, first.packId(), pack.revision(), changed);

    // Then
    assertThatThrownBy(correction).isInstanceOf(SportingConflictException.class);
    assertThat(classifications.pack(account, first.packId())).isEqualTo(pack);
  }

  @Test
  @DisplayName(
      "A classification change waits for collection and validates its newly committed participation")
  void waitsForCollection() throws Exception {
    // Given
    PoolView first = pool("A", "pack", ORIGINAL);
    PoolView outside = pool("B", "other-pack", ORIGINAL);
    match(first, "Shared", "First away");
    ClassificationView before = classifications.pool(account, first.id());
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> correction =
          transaction.execute(
              state -> {
                store.lockSeason(season);
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                change -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  classifications.setPool(
                                      account,
                                      first.id(),
                                      before.revision(),
                                      classification(TARGET));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                match(outside, "Shared", "Outside away");
                return pending;
              });

      // Then
      assertThatThrownBy(() -> correction.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(SportingConflictException.class);
      assertThat(classifications.pool(account, first.id())).isEqualTo(before);
    }
  }

  @Test
  @DisplayName(
      "A waiting collection resolves identities using the classification committed by the correction")
  void collectionUsesCorrectedClassification() throws Exception {
    // Given
    PoolView pool = pool("A", "pack", ORIGINAL);
    MatchView match = match(pool, "Home", "Away");
    ClassificationView before = classifications.pool(account, pool.id());
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<MatchView> collection =
          transaction.execute(
              state -> {
                classifications.setPool(
                    account, pool.id(), before.revision(), classification(TARGET));
                Future<MatchView> pending =
                    worker.submit(
                        () ->
                            transaction.execute(
                                observation -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return match(pool, "Home", "Away");
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return pending;
              });

      // Then
      assertThat(collection.get(15, TimeUnit.SECONDS)).isEqualTo(match);
      assertThat(reads.team(match.homeTeamId()).orElseThrow().classification())
          .isEqualTo(classification(TARGET));
    }
  }

  @Test
  @DisplayName("Rechecks the current grant after a concurrent withdrawal holding the account lock")
  void refusesWithdrawnGrant() throws Exception {
    // Given
    PoolView pool = pool("A", "pack", ORIGINAL);
    ClassificationView before = classifications.pool(account, pool.id());
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> correction =
          transaction.execute(
              state -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id = ? FOR UPDATE", UUID.class, account);
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                change -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  classifications.setPool(
                                      account,
                                      pool.id(),
                                      before.revision(),
                                      classification(TARGET));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                sql.update("DELETE FROM account_permission WHERE account_id = ?", account);
                return pending;
              });

      // Then
      assertThatThrownBy(() -> correction.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccessDeniedException.class);
      assertThat(reads.pool(pool.id()).orElseThrow().classification())
          .isEqualTo(classification(ORIGINAL));
      assertThat(
              sql.queryForObject(
                  "SELECT revision FROM sporting_pool WHERE id = ?", Long.class, pool.id()))
          .isZero();
    }
  }

  /**
   * Establishes a classified identity with no administrative acquisition setting.
   *
   * @param reference native pool reference in the scenario's season
   * @param pack acquisition grouping reference
   * @param division accepted classification owner
   * @return persisted pool with the scenario's initial classification
   */
  private PoolView pool(String reference, String pack, UUID division) {
    return identities.establishPool(
        new PoolKey(
            CollectionProviderEnum.FFVB, season, "organizer", "competition", null, null, reference),
        pack,
        reference,
        classification(division));
  }

  /**
   * Establishes two exact synthetic club/name keys and their participation.
   *
   * @param pool encounter's pool and classification owner
   * @param home exact home team label
   * @param away exact away team label
   * @return identified encounter and participant references
   */
  private MatchView match(PoolView pool, String home, String away) {
    return identities.identifyMatch(
        pool.id(),
        "M1",
        new TeamCandidate(null, home, "0001", null),
        new TeamCandidate(null, away, "0002", null));
  }

  /**
   * Supplies the complete scenario-owned classification.
   *
   * @param division target division identity
   * @return complete female six-a-side classification
   */
  private SportingClassification classification(UUID division) {
    return new SportingClassification(division, SportFormatEnum._6X6, SportGenderEnum.FEMALE);
  }
}
