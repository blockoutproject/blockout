package com.blockout.backend.access.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ReadAccessConfiguration;
import com.blockout.backend.access.application.UpdateAccessSettings;
import com.blockout.backend.access.application.UpdateAccessSettings.MaintenanceChange;
import com.blockout.backend.access.application.UpdateAccessSettings.PlatformChange;
import com.blockout.backend.access.application.UpdateAccessSettings.VersionChange;
import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.InvalidAccessSettingsException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.StaleSettingsRevisionException;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Migrated PostgreSQL, actual JPA versions, account locks and proxied application transactions. */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Testcontainers
@DisplayName("Atomic access settings PostgreSQL persistence")
class AccessSettingsIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @Autowired private JdbcTemplate sql;
  @Autowired private UpdateAccessSettings updates;
  @Autowired private ReadAccessConfiguration reads;
  @Autowired private AccessSettingsStore store;
  @Autowired private AccountStore accounts;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private EntityManagerFactory entityManagerFactory;
  private TransactionTemplate transaction;
  private UUID first;
  private UUID second;

  /**
   * Applies the actual baseline before validation-only application startup.
   *
   * @param properties isolated database inputs for this suite's context
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Restores only this container's fixture rows without resetting a database or schema. */
  @BeforeEach
  void prepareEditors() {
    transaction = new TransactionTemplate(transactions);
    sql.update("DELETE FROM account");
    sql.update(
        "UPDATE access_settings SET revision=0, active=false, message='Prepared', image_url=NULL WHERE id='maintenance'");
    sql.update(
        "UPDATE access_settings SET revision=0, message=NULL, ios_minimum_version=NULL, ios_store_url=NULL, android_minimum_version=NULL, android_store_url=NULL WHERE id='versions'");
    first =
        transaction.execute(
            s ->
                accounts
                    .create(
                        "https://identity.example.invalid/",
                        "auth0|first",
                        "First_175",
                        "first@example.invalid",
                        null)
                    .id());
    second =
        transaction.execute(
            s ->
                accounts
                    .create(
                        "https://identity.example.invalid/",
                        "auth0|second",
                        "Second_175",
                        "second@example.invalid",
                        null)
                    .id());
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'maintenance.manage'), (?, 'application-versions.manage'), (?, 'maintenance.manage'), (?, 'application-versions.manage')",
        first,
        first,
        second,
        second);
  }

  @Test
  @DisplayName("Refuses a settings write without its application transaction")
  void requiresWriteTransaction() {
    // Given
    MaintenanceSettings changed = new MaintenanceSettings(0, true, "Changed", null);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable write =
        () -> store.saveMaintenance(changed);

    // Then
    assertThatThrownBy(write).isInstanceOf(IllegalTransactionStateException.class);
    assertThat(store.maintenance()).isEqualTo(new MaintenanceSettings(0, false, "Prepared", null));
  }

  @Test
  @DisplayName("Refuses optimistic mutation loading without a transaction retaining the check")
  void requiresMutationLoadTransaction() {
    // Given: no caller transaction is open.

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable load = store::maintenanceForChange;

    // Then
    assertThatThrownBy(load).isInstanceOf(IllegalTransactionStateException.class);
  }

  @Test
  @DisplayName("Seeds exactly two independently versioned fixed groups")
  void readsFixedGroups() {
    // Given
    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    statistics.clear();

    // When
    ReadAccessConfiguration.Snapshot result = reads.read();

    // Then
    assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
    assertThat(result.maintenance().active()).isFalse();
    assertThat(result.versions().ios().minimumVersion()).isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM access_settings", Long.class)).isEqualTo(2);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Saving content retains activation and leaves the versions group untouched")
  void preservesActivation(boolean active) {
    // Given
    updates.activate(first, 0, active);
    long revision = reads.maintenance(first).revision();

    // When
    MaintenanceSettings saved =
        updates.changeMaintenance(
            first,
            new MaintenanceChange(
                revision,
                "  New message  ",
                JsonNullable.of("https://assets.example.invalid/maintenance.png")));

    // Then
    assertThat(saved.active()).isEqualTo(active);
    assertThat(saved.message()).isEqualTo("New message");
    assertThat(reads.versions(first).revision()).isZero();
    assertThat(reads.read().maintenance().message()).isEqualTo("New message");
  }

  @Test
  @DisplayName("Matching no-ops preserve revision while stale no-ops conflict")
  void distinguishesNoops() {
    // Given
    MaintenanceSettings current = updates.changeMaintenance(first, content(0, "Changed"));

    // When
    MaintenanceSettings noop =
        updates.changeMaintenance(second, content(current.revision(), "Changed"));

    // Then
    assertThat(noop.revision()).isEqualTo(current.revision());
    assertThatThrownBy(() -> updates.changeMaintenance(first, content(0, "Changed")))
        .isInstanceOf(StaleSettingsRevisionException.class);
    assertThat(updates.activate(first, current.revision(), false).revision())
        .isEqualTo(current.revision());
  }

  @Test
  @DisplayName("Null clears only the image and omission keeps the content")
  void clearsOptionalImage() {
    // Given
    MaintenanceSettings withImage =
        updates.changeMaintenance(
            first,
            new MaintenanceChange(
                0, null, JsonNullable.of("https://assets.example.invalid/a.png")));

    // When
    MaintenanceSettings saved =
        updates.changeMaintenance(
            first, new MaintenanceChange(withImage.revision(), null, JsonNullable.of(null)));

    // Then
    assertThat(saved.imageUrl()).isNull();
    assertThat(saved.message()).isEqualTo("Prepared");
    assertThat(saved.active()).isFalse();
  }

  @Test
  @DisplayName("Validates the entire resulting versions group before any write")
  void rejectsPartialInvalidResult() {
    // Given
    VersionChange valid =
        new VersionChange(
            0,
            new PlatformChange(
                JsonNullable.of("2.10.0"),
                JsonNullable.of("https://apps.apple.com/fr/app/blockout/id123")),
            null,
            JsonNullable.of("Update"));
    ApplicationVersionSettings saved = updates.changeVersions(first, valid);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable invalid =
        () ->
            updates.changeVersions(
                first,
                new VersionChange(
                    saved.revision(),
                    new PlatformChange(JsonNullable.undefined(), JsonNullable.of(null)),
                    new PlatformChange(
                        JsonNullable.of("3.0.0"),
                        JsonNullable.of(
                            "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout")),
                    JsonNullable.of(null)));

    // Then
    assertThatThrownBy(invalid).isInstanceOf(InvalidAccessSettingsException.class);
    assertThat(reads.versions(first)).isEqualTo(saved);
  }

  @Test
  @DisplayName("Platform changes share one revision and cannot overwrite each other")
  void conflictsAcrossPlatforms() {
    // Given
    updates.changeVersions(
        first,
        new VersionChange(
            0,
            new PlatformChange(
                JsonNullable.of("2.0.0"), JsonNullable.of("https://apps.apple.com/app/id123")),
            null,
            JsonNullable.undefined()));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable android =
        () ->
            updates.changeVersions(
                second,
                new VersionChange(
                    0,
                    null,
                    new PlatformChange(
                        JsonNullable.of("2.0.0"),
                        JsonNullable.of(
                            "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout")),
                    JsonNullable.undefined()));

    // Then
    assertThatThrownBy(android).isInstanceOf(StaleSettingsRevisionException.class);
    assertThat(reads.versions(first).android().minimumVersion()).isNull();
  }

  @Test
  @DisplayName(
      "Concurrent same-group writes retain JPA optimistic exclusion after revision comparison")
  void excludesConcurrentCommit() throws Exception {
    // Given
    CyclicBarrier loaded = new CyclicBarrier(2);

    // When
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> a = workers.submit(() -> concurrentContent(first, "First", loaded));
      Future<?> b = workers.submit(() -> concurrentContent(second, "Second", loaded));
      int accepted = 0;
      int conflicts = 0;
      for (Future<?> result : java.util.List.of(a, b)) {
        try {
          result.get(15, TimeUnit.SECONDS);
          accepted++;
        } catch (ExecutionException failure) {
          assertThat(failure.getCause()).isInstanceOf(OptimisticLockingFailureException.class);
          conflicts++;
        }
      }
      // Then
      assertThat(accepted).isEqualTo(1);
      assertThat(conflicts).isEqualTo(1);
    }
    assertThat(reads.maintenance(first).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName("Concurrent independent-group writes both succeed")
  void permitsIndependentGroups() throws Exception {
    // Given
    CyclicBarrier loaded = new CyclicBarrier(2);

    // When
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> maintenance =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      s -> {
                        store.maintenanceForChange();
                        awaitBoth(loaded);
                        updates.changeMaintenance(first, content(0, "Independent"));
                      }));
      Future<?> versions =
          workers.submit(
              () ->
                  transaction.executeWithoutResult(
                      s -> {
                        store.versionsForChange();
                        awaitBoth(loaded);
                        updates.changeVersions(
                            second,
                            new VersionChange(
                                0, null, null, JsonNullable.of("Independent update")));
                      }));
      maintenance.get(15, TimeUnit.SECONDS);
      versions.get(15, TimeUnit.SECONDS);
    }

    // Then
    assertThat(reads.maintenance(first).revision()).isEqualTo(1);
    assertThat(reads.versions(first).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName("Refuses revision overflow but accepts the largest matching no-op")
  void refusesOverflow() {
    // Given
    sql.update("UPDATE access_settings SET revision=9007199254740991 WHERE id='maintenance'");

    // When
    MaintenanceSettings noop =
        updates.changeMaintenance(first, content(9007199254740991L, "Prepared"));

    // Then
    assertThat(noop.revision()).isEqualTo(9007199254740991L);
    assertThatThrownBy(
            () -> updates.changeMaintenance(first, content(9007199254740991L, "Overflow")))
        .isInstanceOf(InvalidAccessSettingsException.class);
    assertThat(reads.maintenance(first)).isEqualTo(noop);
  }

  @ParameterizedTest
  @ValueSource(strings = {"maintenance", "versions"})
  @DisplayName("A missing group is unavailable instead of synthesized defaults")
  void refusesMissingSettings(String group) {
    // Given
    sql.update("DELETE FROM access_settings WHERE id=?", group);
    try {
      // When
      Throwable failure = org.assertj.core.api.Assertions.catchThrowable(reads::read);

      // Then
      assertThat(failure).isInstanceOf(AccessSettingsUnavailableException.class);
    } finally {
      // Restore the disposable fixture for the next method without rerunning migrations.
      sql.update(
          "INSERT INTO access_settings(id, revision, active, message) VALUES (?,0,?,?)",
          group,
          group.equals("maintenance") ? false : null,
          group.equals("maintenance") ? "Prepared" : null);
    }
  }

  @Test
  @DisplayName("Invalid stored configuration fails closed even when maintenance is inactive")
  void refusesInvalidStoredSettings() {
    // Given
    sql.update("UPDATE access_settings SET message='   ' WHERE id='maintenance'");

    // When
    Throwable failure = org.assertj.core.api.Assertions.catchThrowable(reads::read);

    // Then
    assertThat(failure).isInstanceOf(AccessSettingsUnavailableException.class);
  }

  @Test
  @DisplayName("A revoked original editor cannot change settings")
  void refusesRevokedEditor() {
    // Given
    sql.update("DELETE FROM account_permission WHERE account_id=?", first);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> updates.changeMaintenance(first, content(0, "Refused")));

    // Then
    assertThat(failure).isInstanceOf(AccessDeniedException.class);
    assertThat(reads.maintenance(second).message()).isEqualTo("Prepared");
  }

  @Test
  @DisplayName("A manual withdrawal ordered first refuses the blocked settings mutation")
  void refusesWaitingEditorAfterWithdrawal() throws Exception {
    // Given
    CompletableFuture<Integer> mutationPid = new CompletableFuture<>();

    // When
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> mutation =
          transaction.execute(
              state -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id = ? FOR UPDATE", UUID.class, first);
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                write -> {
                                  mutationPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  updates.changeMaintenance(
                                      first, content(0, "Refused after withdrawal"));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, mutationPid);
                sql.update(
                    "DELETE FROM account_permission WHERE account_id = ? AND permission = 'maintenance.manage'",
                    first);
                return pending;
              });

      // Then
      assertThatThrownBy(() -> mutation.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccessDeniedException.class);
      assertThat(reads.maintenance(second).message()).isEqualTo("Prepared");
    }
  }

  @Test
  @DisplayName("An authorized settings mutation commits before a waiting withdrawal")
  void completesEditorBeforeWithdrawal() throws Exception {
    // Given
    CompletableFuture<Integer> withdrawalPid = new CompletableFuture<>();

    // When
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> withdrawal =
          transaction.execute(
              state -> {
                updates.changeMaintenance(first, content(0, "Accepted before withdrawal"));
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                revoke -> {
                                  withdrawalPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  sql.queryForObject(
                                      "SELECT id FROM account WHERE id = ? FOR UPDATE",
                                      UUID.class,
                                      first);
                                  sql.update(
                                      "DELETE FROM account_permission WHERE account_id = ? AND permission = 'maintenance.manage'",
                                      first);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, withdrawalPid);
                return pending;
              });
      withdrawal.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(reads.maintenance(second).message()).isEqualTo("Accepted before withdrawal");
      assertThatThrownBy(() -> updates.activate(first, 1, true))
          .isInstanceOf(AccessDeniedException.class);
    }
  }

  @Test
  @DisplayName("Version no-ops preserve the largest safe revision and real changes refuse overflow")
  void refusesVersionOverflow() {
    // Given
    sql.update("UPDATE access_settings SET revision=9007199254740991 WHERE id='versions'");

    // When
    ApplicationVersionSettings noop =
        updates.changeVersions(
            first, new VersionChange(9007199254740991L, null, null, JsonNullable.undefined()));

    // Then
    assertThat(noop.revision()).isEqualTo(9007199254740991L);
    assertThatThrownBy(
            () ->
                updates.changeVersions(
                    first,
                    new VersionChange(9007199254740991L, null, null, JsonNullable.of("Overflow"))))
        .isInstanceOf(InvalidAccessSettingsException.class);
    assertThat(reads.versions(first)).isEqualTo(noop);
  }

  @Test
  @DisplayName("A matching no-op retains JPA optimistic verification until outer commit")
  void checksNoopAtCommit() {
    // Given
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      org.assertj.core.api.ThrowableAssert.ThrowingCallable noop =
          () ->
              transaction.executeWithoutResult(
                  state -> {
                    store.maintenanceForChange();
                    updates.changeMaintenance(first, content(0, "Prepared"));
                    try {
                      worker
                          .submit(() -> updates.changeMaintenance(second, content(0, "Concurrent")))
                          .get(15, TimeUnit.SECONDS);
                    } catch (Exception failure) {
                      throw new IllegalStateException("Concurrent fixture failed", failure);
                    }
                  });

      // When
      Throwable failure = org.assertj.core.api.Assertions.catchThrowable(noop);

      // Then
      assertThat(failure).isInstanceOf(OptimisticLockingFailureException.class);
      assertThat(reads.maintenance(second).message()).isEqualTo("Concurrent");
    }
  }

  @ParameterizedTest
  @ValueSource(longs = {-1L, 9007199254740992L})
  @DisplayName("PostgreSQL rejects unsafe persisted revisions independently of the application")
  void constrainsStoredRevision(long revision) {
    // Given
    org.assertj.core.api.ThrowableAssert.ThrowingCallable invalid =
        () ->
            sql.update(
                "UPDATE access_settings SET revision = ? WHERE id = 'maintenance'", revision);

    // When
    Throwable failure = org.assertj.core.api.Assertions.catchThrowable(invalid);

    // Then
    assertThat(failure).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    assertThat(reads.maintenance(first).revision()).isZero();
  }

  /**
   * Loads the old managed state in both transactions before either attempts its application write.
   *
   * @param editor independently authorized fixture account
   * @param message desired competing content
   * @param loaded barrier retaining both original revisions before either write
   */
  private void concurrentContent(UUID editor, String message, CyclicBarrier loaded) {
    transaction.executeWithoutResult(
        s -> {
          store.maintenanceForChange();
          awaitBoth(loaded);
          updates.changeMaintenance(editor, content(0, message));
        });
  }

  /**
   * Establishes a deterministic overlapping transaction window without sleeps.
   *
   * @param barrier both transactions' rendezvous after loading the old revision
   */
  private static void awaitBoth(CyclicBarrier barrier) {
    try {
      barrier.await(10, TimeUnit.SECONDS);
    } catch (Exception failure) {
      throw new IllegalStateException("Concurrent fixture failed", failure);
    }
  }

  /**
   * Keeps decisive revision/message explicit while omitting the optional image.
   *
   * @param revision expected maintenance revision
   * @param message desired content for the scenario
   * @return a content-only command retaining stored media
   */
  private static MaintenanceChange content(long revision, String message) {
    return new MaintenanceChange(revision, message, JsonNullable.undefined());
  }
}
