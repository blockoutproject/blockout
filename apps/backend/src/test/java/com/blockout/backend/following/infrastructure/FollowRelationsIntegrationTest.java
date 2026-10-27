package com.blockout.backend.following.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.FollowStore;
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.following.application.ReadFollowEligibility;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real relation commits/locks with controlled account-row removal, not F05 erasure orchestration.
 */
@SpringBootTest
@DisplayName("Durable team and pool follows on PostgreSQL")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class FollowRelationsIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000010");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000011");
  private static final UUID PACK = UUID.fromString("00000000-0000-4000-8000-000000000012");
  // Deliberately equal UUIDs in different owner tables must remain distinct typed targets.
  private static final UUID TARGET = UUID.fromString("00000000-0000-4000-8000-000000000013");
  @Autowired private JdbcTemplate sql;
  @Autowired private FollowState state;
  @Autowired private FollowStore store;
  @Autowired private ReadFollowEligibility eligibility;
  @Autowired private AccountAccess accounts;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private PrincipalReader provider;

  /**
   * Resets only this container and creates synthetic, currently viewable F02/F05 identities.
   *
   * @throws Exception when fixture setup fails
   */
  @BeforeEach
  void owners() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute("TRUNCATE sporting_season, sporting_division, account CASCADE");
    }
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'one', 'first', 'one@example.invalid'), (?, 'https://identity.example.invalid/', 'two', 'second', 'two@example.invalid')",
        ACCOUNT,
        OTHER);
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, 2026, '2026/2027')", SEASON);
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Synthetic', TRUE, '#112233')",
        DIVISION);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', 'pack')",
        PACK,
        SEASON);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', 'pool', 'Synthetic pool', ?, '_6X6', 'MIXED')",
        TARGET,
        SEASON,
        PACK,
        DIVISION);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', 'home', 'Home', 'home', ?, '_6X6', 'MIXED')",
        TARGET,
        SEASON,
        DIVISION);
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        UUID.fromString("00000000-0000-4000-8000-000000000101"),
        TARGET,
        TARGET);
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Preserves UUID on repeated true and assigns a new UUID after removal")
  void replacesIdempotently(TargetType type) {
    // Given
    FollowContext context = context(type);
    assertThat(state.read(context)).isFalse();
    assertThat(state.replace(context, true)).isTrue();
    UUID original = relation(type).id();

    // When
    boolean repeatedTrue = state.replace(context, true);
    UUID retained = relation(type).id();
    boolean firstRemoval = state.replace(context, false);
    boolean repeatedRemoval = state.replace(context, false);
    Optional<Relation> removed = store.find(context);
    boolean restored = state.replace(context, true);
    UUID recreated = relation(type).id();

    // Then
    assertThat(repeatedTrue).isTrue();
    assertThat(retained).isEqualTo(original);
    assertThat(firstRemoval).isFalse();
    assertThat(repeatedRemoval).isFalse();
    assertThat(removed).isEmpty();
    assertThat(restored).isTrue();
    assertThat(recreated).isNotEqualTo(original);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_team", Long.class)).isEqualTo(1L);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_pool", Long.class)).isEqualTo(1L);
    verifyNoInteractions(provider);
  }

  @Test
  @DisplayName("Removes only the exact owner's typed association")
  void isolatesOwnersAndKinds() {
    // Given
    state.replace(context(TargetType.TEAM), true);
    assertThat(state.read(context(TargetType.POOL))).isFalse();
    state.replace(context(TargetType.POOL), true);
    FollowContext other = new FollowContext(OTHER, context(TargetType.TEAM).target());
    state.replace(other, true);

    // When
    state.replace(context(TargetType.TEAM), false);

    // Then
    assertThat(state.read(context(TargetType.TEAM))).isFalse();
    assertThat(state.read(context(TargetType.POOL))).isTrue();
    assertThat(state.read(other)).isTrue();
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Enforces non-null owners/targets, foreign keys and pair uniqueness in PostgreSQL")
  void enforcesConstraints(TargetType type) {
    // Given
    String table = type == TargetType.TEAM ? "team_follow" : "pool_follow";
    String column = type == TargetType.TEAM ? "team_id" : "pool_id";
    String insert = "INSERT INTO " + table + "(id, account_id, " + column + ") VALUES (?, ?, ?)";
    state.replace(context(type), true);

    // When: each statement commits independently, so every rejection reaches SQL.
    Throwable observedFailure =
        catchThrowable(() -> sql.update(insert, UUID.randomUUID(), ACCOUNT, TARGET));

    // Then
    assertThat(observedFailure).isInstanceOf(DataIntegrityViolationException.class);

    // When
    Throwable secondFailure =
        catchThrowable(() -> sql.update(insert, UUID.randomUUID(), null, TARGET));

    // Then
    assertThat(secondFailure).isInstanceOf(DataIntegrityViolationException.class);

    // When
    Throwable thirdFailure =
        catchThrowable(() -> sql.update(insert, UUID.randomUUID(), ACCOUNT, null));

    // Then
    assertThat(thirdFailure).isInstanceOf(DataIntegrityViolationException.class);

    // When
    Throwable fourthFailure =
        catchThrowable(() -> sql.update(insert, UUID.randomUUID(), UUID.randomUUID(), TARGET));

    // Then
    assertThat(fourthFailure).isInstanceOf(DataIntegrityViolationException.class);

    // When
    Throwable fifthFailure =
        catchThrowable(() -> sql.update(insert, UUID.randomUUID(), ACCOUNT, UUID.randomUUID()));

    // Then
    assertThat(fifthFailure).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM " + table, Long.class)).isEqualTo(1L);
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Retains a hidden relation and restores its identity when F02 permits viewing again")
  void retainsHiddenRelations(TargetType type) {
    // Given
    state.replace(context(type), true);
    UUID original = relation(type).id();
    sql.update(
        "UPDATE sporting_pool SET catalog_eligible=FALSE, calendar_empty=TRUE WHERE id=?", TARGET);

    // When
    Throwable observedFailure = catchThrowable(() -> state.read(context(type)));

    // Then
    assertThat(observedFailure).isInstanceOf(FollowUnavailableTargetException.class);

    // When
    Throwable secondFailure = catchThrowable(() -> state.replace(context(type), false));

    // Then
    assertThat(secondFailure).isInstanceOf(FollowUnavailableTargetException.class);
    assertThat(relation(type).id()).isEqualTo(original);

    // Given
    sql.update(
        "UPDATE sporting_pool SET catalog_eligible=TRUE, calendar_empty=FALSE WHERE id=?", TARGET);
    sql.update("UPDATE sporting_division SET active=FALSE WHERE id=?", DIVISION);

    // When
    Throwable thirdFailure = catchThrowable(() -> state.read(context(type)));

    // Then
    assertThat(thirdFailure).isInstanceOf(FollowUnavailableTargetException.class);

    // Given
    sql.update("UPDATE sporting_division SET active=TRUE WHERE id=?", DIVISION);

    // When
    boolean restored = state.read(context(type));

    // Then
    assertThat(restored).isTrue();
    assertThat(relation(type).id()).isEqualTo(original);
  }

  @Test
  @DisplayName(
      "Keeps corrections on the original identity without transferring to homonyms in another season")
  void preservesIdentityAcrossCorrections() {
    // Given
    state.replace(context(TargetType.TEAM), true);
    UUID original = relation(TargetType.TEAM).id();
    UUID nextSeason = UUID.fromString("00000000-0000-4000-8000-000000000102");
    UUID nextTeam = UUID.fromString("00000000-0000-4000-8000-000000000103");
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, 2027, '2027/2028')",
        nextSeason);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) SELECT ?, ?, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender FROM sporting_team WHERE id=?",
        nextTeam,
        nextSeason,
        TARGET);

    // When
    sql.update(
        "UPDATE sporting_team SET source_name='Corrected', comparison_name='corrected', gender='MALE' WHERE id=?",
        TARGET);

    // Then
    assertThat(state.read(context(TargetType.TEAM))).isTrue();
    assertThat(relation(TargetType.TEAM).id()).isEqualTo(original);
    assertThat(store.find(new FollowContext(ACCOUNT, new Target(TargetType.TEAM, nextTeam))))
        .isEmpty();
    assertThat(eligibility.recipients(Set.of(context(TargetType.TEAM).target())))
        .containsEntry(ACCOUNT, Set.of(relation(TargetType.TEAM)));
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Rejects unknown targets without creating a relationship")
  void refusesMissingTarget(TargetType type) {
    // Given
    FollowContext missing = new FollowContext(ACCOUNT, new Target(type, UUID.randomUUID()));

    // When
    Throwable observedFailure = catchThrowable(() -> state.replace(missing, true));

    // Then
    assertThat(observedFailure).isInstanceOf(FollowUnavailableTargetException.class);
    assertThat(store.find(missing)).isEmpty();
  }

  @Test
  @DisplayName("Rolls back all relation changes on a later transactional failure")
  void rollsBack() {
    // Given
    state.replace(context(TargetType.POOL), true);
    UUID original = relation(TargetType.POOL).id();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    Throwable observedFailure =
        catchThrowable(
            () ->
                transaction.executeWithoutResult(
                    status -> {
                      state.replace(context(TargetType.POOL), false);
                      state.replace(context(TargetType.TEAM), true);
                      throw new IllegalStateException("Controlled rollback");
                    }));

    // Then
    assertThat(observedFailure).isInstanceOf(IllegalStateException.class);
    assertThat(store.find(context(TargetType.TEAM))).isEmpty();
    assertThat(relation(TargetType.POOL).id()).isEqualTo(original);
  }

  @ParameterizedTest
  @CsvSource({"true,true", "true,false", "false,true", "false,false"})
  @DisplayName("Serializes two devices so the last server-recorded state wins")
  void serializesDevices(boolean first, boolean last) throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<Boolean> waiting =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<Boolean> second =
                    worker.submit(
                        () ->
                            transaction.execute(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return state.replace(context(TargetType.TEAM), last);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                state.replace(context(TargetType.TEAM), first);
                return second;
              });

      // When
      boolean confirmed = waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(confirmed).isEqualTo(last);
      assertThat(state.read(context(TargetType.TEAM))).isEqualTo(last);
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM team_follow", Long.class))
          .isEqualTo(last ? 1L : 0L);
      verifyNoInteractions(provider);
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "A waiting original-account write cannot recreate relations after controlled row deletion")
  void deletionWins(boolean recreate) throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<Boolean> waiting =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<Boolean> writer =
                    worker.submit(
                        () ->
                            transaction.execute(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return state.replace(context(TargetType.TEAM), true);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
                return writer;
              });
      if (recreate)
        sql.update(
            "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'one', 'replacement', 'replacement@example.invalid')",
            UUID.fromString("00000000-0000-4000-8000-000000000104"));

      // When
      Throwable observedFailure = catchThrowable(() -> waiting.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(observedFailure).hasCauseInstanceOf(AccountNotFoundException.class);
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM team_follow", Long.class)).isZero();
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM pool_follow", Long.class)).isZero();
      verifyNoInteractions(provider);
    }
  }

  @Test
  @DisplayName(
      "A controlled deletion waits for the writer then removes its relation in the same transaction")
  void writerWins() throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> deletion =
          transaction.execute(
              status -> {
                state.replace(context(TargetType.POOL), true);
                Future<?> remover =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  accounts.lock(ACCOUNT);
                                  // Controlled fixture only: T011/F05 own the real participant and
                                  // erasure wiring.
                                  sql.update("DELETE FROM pool_follow WHERE account_id=?", ACCOUNT);
                                  sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                return remover;
              });

      // When
      deletion.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(store.find(context(TargetType.POOL))).isEmpty();

      // When
      Throwable observedFailure =
          catchThrowable(() -> state.replace(context(TargetType.POOL), true));

      // Then
      assertThat(observedFailure).isInstanceOf(AccountNotFoundException.class);
      verifyNoInteractions(provider);
    }
  }

  @Test
  @DisplayName("Reads current typed relations for eligibility and excludes a recreated UUID")
  void readsEligibility() {
    // Given
    state.replace(context(TargetType.TEAM), true);
    state.replace(context(TargetType.POOL), true);
    Relation original = relation(TargetType.TEAM);
    Map<UUID, Set<Relation>> recipients =
        eligibility.recipients(
            Set.of(context(TargetType.TEAM).target(), context(TargetType.POOL).target()));

    // When
    state.replace(context(TargetType.TEAM), false);
    state.replace(context(TargetType.TEAM), true);

    // Then
    assertThat(recipients).containsEntry(ACCOUNT, Set.of(original, relation(TargetType.POOL)));
    assertThat(eligibility.stillPresent(original)).isFalse();
    assertThat(eligibility.stillPresent(relation(TargetType.TEAM))).isTrue();
  }

  /**
   * Builds the explicit original owner and exact typed target for the scenario.
   *
   * @param type exact association kind
   * @return admitted original owner/target
   */
  private FollowContext context(TargetType type) {
    return new FollowContext(ACCOUNT, new Target(type, TARGET));
  }

  /**
   * Reads the persisted immutable relation, including its current lifecycle identity.
   *
   * @param type exact association kind
   * @return currently persisted relation
   */
  private Relation relation(TargetType type) {
    return store.find(context(type)).orElseThrow();
  }
}
