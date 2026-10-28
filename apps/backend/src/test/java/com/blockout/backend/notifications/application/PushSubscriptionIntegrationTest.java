package com.blockout.backend.notifications.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
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
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real committed registrations and schema/lock races; F05 erasure orchestration remains with T038.
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Push association lifecycle on PostgreSQL")
class PushSubscriptionIntegrationTest {
  private static final UUID ID = UUID.fromString("10000000-0000-4000-8000-000000000001");
  private static final UUID NEXT = UUID.fromString("10000000-0000-4000-8000-000000000002");
  private static final UUID INSTALLATION = UUID.fromString("20000000-0000-4000-8000-000000000001");
  private static final UUID SECOND_INSTALLATION =
      UUID.fromString("20000000-0000-4000-8000-000000000002");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ChangePushSubscriptions changes;
  @Autowired private PushSubscriptionStore store;
  @Autowired private AccountAccess accounts;
  @Autowired private PlatformTransactionManager transactions;

  /** Prepares two synthetic accounts in this suite's disposable migrated database. */
  @BeforeEach
  void owners() throws Exception {
    reset(database, sql);
  }

  @Test
  @DisplayName("Two installations remain distinct and rotation keeps the connection identity")
  void rotatesWithoutDuplicating() {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
    changes.replace(new Registration(NEXT, SECOND_INSTALLATION, ACCOUNT, "Expo[two]"));

    // When
    PushSubscriptionStore.Replacement rotated =
        changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[rotated]"));

    // Then
    assertThat(rotated.created()).isFalse();
    assertThat(rotated.association().id()).isEqualTo(ID);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM push_subscription", Long.class))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT expo_push_token FROM push_subscription WHERE subscription_id=?",
                String.class,
                ID))
        .isEqualTo("Expo[rotated]");
  }

  @Test
  @DisplayName("Unchanged registration advances native version and an old receipt cannot remove it")
  void advancesUnchangedRevision() {
    // Given
    Registration registration = new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]");
    changes.replace(registration);
    long revision =
        sql.queryForObject(
            "SELECT revision FROM push_subscription WHERE subscription_id=?", Long.class, ID);
    UUID target =
        sql.queryForObject(
            "SELECT id FROM push_subscription WHERE subscription_id=?", UUID.class, ID);

    // When
    changes.replace(registration);
    boolean invalidated =
        new TransactionTemplate(transactions)
            .execute(status -> store.invalidate(target, revision, "Expo[one]"));

    // Then
    assertThat(invalidated).isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT revision FROM push_subscription WHERE subscription_id=?", Long.class, ID))
        .isGreaterThan(revision);
  }

  @Test
  @DisplayName(
      "Full reassociation removes both conflicting bindings and exact old deletion preserves the"
          + " replacement")
  void replacesBothConflicts() {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
    changes.replace(new Registration(NEXT, SECOND_INSTALLATION, OTHER, "Expo[two]"));
    UUID fresh = UUID.fromString("10000000-0000-4000-8000-000000000003");

    // When
    changes.replace(new Registration(fresh, INSTALLATION, OTHER, "Expo[two]"));
    changes.remove(new NotificationContext(ACCOUNT), ID);
    changes.remove(new NotificationContext(OTHER), NEXT);

    // Then
    assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
        .containsExactly(fresh);
    assertThat(
            sql.queryForObject(
                "SELECT account_id FROM push_subscription WHERE subscription_id=?",
                UUID.class,
                fresh))
        .isEqualTo(OTHER);
  }

  @Test
  @DisplayName(
      "A stale address receipt cannot remove a rotated target and the current exact receipt can")
  void invalidatesOnlyExactTarget() {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[rotated]"));
    long revision =
        sql.queryForObject(
            "SELECT revision FROM push_subscription WHERE subscription_id=?", Long.class, ID);
    UUID target =
        sql.queryForObject(
            "SELECT id FROM push_subscription WHERE subscription_id=?", UUID.class, ID);
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    boolean stale = transaction.execute(status -> store.invalidate(target, revision, "Expo[one]"));
    boolean exact =
        transaction.execute(status -> store.invalidate(target, revision, "Expo[rotated]"));

    // Then
    assertThat(stale).isFalse();
    assertThat(exact).isTrue();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM push_subscription", Long.class)).isZero();
  }

  @Test
  @DisplayName("A foreign exact ID cannot be overwritten or deleted")
  void refusesForeignIdentity() {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));

    // When
    Throwable failure =
        catchThrowable(
            () -> changes.replace(new Registration(ID, SECOND_INSTALLATION, OTHER, "Expo[two]")));
    changes.remove(new NotificationContext(OTHER), ID);

    // Then
    assertThat(failure).isInstanceOf(NotificationNotFoundException.class);
    assertThat(
            sql.queryForObject(
                "SELECT account_id FROM push_subscription WHERE subscription_id=?", UUID.class, ID))
        .isEqualTo(ACCOUNT);
  }

  @Test
  @DisplayName(
      "Account locks serialize reassociation and a waiting command cannot recreate a removed"
          + " original owner")
  void respectsOriginalOwnerLock() throws Exception {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> pending =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<?> waiting =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  changes.replace(
                                      new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
                return waiting;
              });

      // When
      Throwable failure = catchThrowable(() -> pending.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(failure).hasCauseInstanceOf(NotificationNotFoundException.class);
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM push_subscription", Long.class)).isZero();
    }
  }

  @Test
  @DisplayName(
      "A new conflicting owner discovered after locking rolls back without losing its binding")
  void rejectsChangedOwnerSet() throws Exception {
    // Given: the incoming command first sees no binding and then waits for its own account lock.
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> pending =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<?> waiting =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  changes.replace(
                                      new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                // This independent owner had no conflicting binding when the waiting command
                // selected its lock set.
                changes.replace(new Registration(NEXT, INSTALLATION, OTHER, "Expo[one]"));
                return waiting;
              });

      // When
      Throwable failure = catchThrowable(() -> pending.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(failure).hasCauseInstanceOf(PushSubscriptionConflictException.class);
      assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
          .containsExactly(NEXT);
    }
  }

  @Test
  @DisplayName(
      "Cross-account reassociation waits on the lower account before acquiring the higher account")
  void locksAffectedOwnersInOrder() throws Exception {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, OTHER, "Expo[one]"));
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> pending =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<?> waiting =
                    workers.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  changes.replace(
                                      new Registration(NEXT, INSTALLATION, ACCOUNT, "Expo[one]"));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                // The waiting reassociation must not hold OTHER while blocked on the lower ACCOUNT.
                Future<Boolean> higher =
                    workers.submit(() -> transaction.execute(inner -> accounts.lock(OTHER)));
                try {
                  assertThat(higher.get(5, TimeUnit.SECONDS)).isTrue();
                } catch (Exception failure) {
                  throw new AssertionError(failure);
                }
                return waiting;
              });

      // When
      pending.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
          .containsExactly(NEXT);
    }
  }

  @Test
  @DisplayName(
      "Native installation uniqueness rejects a competing insert without changing the current row")
  void enforcesNativeUniqueness() {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));

    // When
    Throwable failure =
        catchThrowable(
            () ->
                sql.update(
                    "INSERT INTO"
                        + " push_subscription(id,subscription_id,installation_id,account_id,expo_push_token)"
                        + " VALUES (?,?,?,?,?)",
                    NEXT,
                    NEXT,
                    INSTALLATION,
                    OTHER,
                    "Expo[two]"));

    // Then
    assertThat(failure).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
        .containsExactly(ID);
  }

  @Test
  @DisplayName("An unresolved native uniqueness race rolls back the complete prior association")
  void rollsBackConcurrentUniqueConflict() throws Exception {
    // Given: the competing installation is not yet visible when OTHER selects and locks its own
    // binding.
    changes.replace(new Registration(NEXT, SECOND_INSTALLATION, OTHER, "Expo[two]"));
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> pending =
          transaction.execute(
              status -> {
                changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
                Future<?> waiting =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  changes.replace(
                                      new Registration(NEXT, INSTALLATION, OTHER, "Expo[changed]"));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                return waiting;
              });

      // When
      Throwable failure = catchThrowable(() -> pending.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(failure)
          .hasCauseInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
      assertThat(
              sql.queryForObject(
                  "SELECT installation_id FROM push_subscription WHERE subscription_id=?",
                  UUID.class,
                  NEXT))
          .isEqualTo(SECOND_INSTALLATION);
      assertThat(
              sql.queryForObject(
                  "SELECT expo_push_token FROM push_subscription WHERE subscription_id=?",
                  String.class,
                  NEXT))
          .isEqualTo("Expo[two]");
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM push_subscription", Long.class))
          .isEqualTo(2);
    }
  }

  @Test
  @DisplayName("An old receipt cannot remove a recreated row for the same sign-in ID and address")
  void separatesRecreatedNativeIdentity() {
    // Given
    Registration registration = new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]");
    changes.replace(registration);
    UUID original =
        sql.queryForObject(
            "SELECT id FROM push_subscription WHERE subscription_id=?", UUID.class, ID);
    long revision =
        sql.queryForObject(
            "SELECT revision FROM push_subscription WHERE subscription_id=?", Long.class, ID);
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(status -> store.invalidate(original, revision, "Expo[one]"));

    // When
    changes.replace(registration);
    boolean stale =
        transaction.execute(status -> store.invalidate(original, revision, "Expo[one]"));

    // Then
    assertThat(stale).isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT id FROM push_subscription WHERE subscription_id=?", UUID.class, ID))
        .isNotEqualTo(original);
    assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
        .containsExactly(ID);
  }

  @Test
  @DisplayName("Repeated exact local removal leaves the owner's other installation associated")
  void preservesOtherInstallationOnRemoval() {
    // Given
    changes.replace(new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]"));
    changes.replace(new Registration(NEXT, SECOND_INSTALLATION, ACCOUNT, "Expo[two]"));

    // When
    changes.remove(new NotificationContext(ACCOUNT), ID);
    changes.remove(new NotificationContext(ACCOUNT), ID);

    // Then
    assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
        .containsExactly(NEXT);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "A binding appearing after the final locked selection is neither deleted nor reassigned")
  void refusesNewBindingAfterSelection(boolean exactId) throws Exception {
    // Given: hold only A's account and capture the final empty set through the real persistence
    // port.
    Registration registration = new Registration(ID, INSTALLATION, ACCOUNT, "Expo[one]");
    UUID newcomerId = exactId ? ID : NEXT;
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Throwable failure =
          catchThrowable(
              () ->
                  transaction.executeWithoutResult(
                      status -> {
                        accounts.lock(ACCOUNT);
                        List<PushSubscriptionStore.Association> selected =
                            store.affected(registration);
                        Future<?> newcomer =
                            worker.submit(
                                () ->
                                    changes.replace(
                                        new Registration(
                                            newcomerId, INSTALLATION, OTHER, "Expo[two]")));
                        try {
                          newcomer.get(5, TimeUnit.SECONDS);
                        } catch (Exception interrupted) {
                          throw new AssertionError(interrupted);
                        }
                        store.replace(registration, selected);
                      }));

      // Then
      assertThat(failure)
          .isInstanceOf(
              exactId
                  ? PushSubscriptionConflictException.class
                  : org.springframework.dao.DataIntegrityViolationException.class);
      assertThat(sql.queryForList("SELECT subscription_id FROM push_subscription", UUID.class))
          .containsExactly(newcomerId);
      assertThat(
              sql.queryForObject(
                  "SELECT account_id FROM push_subscription WHERE subscription_id=?",
                  UUID.class,
                  newcomerId))
          .isEqualTo(OTHER);
      assertThat(
              sql.queryForObject(
                  "SELECT expo_push_token FROM push_subscription WHERE subscription_id=?",
                  String.class,
                  newcomerId))
          .isEqualTo("Expo[two]");
    }
  }
}
