package com.blockout.backend.access.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.testsupport.PostgresTestDatabase;
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
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
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

/**
 * Uses migrated PostgreSQL and the real account lock; domain effects and manual SQL are test-owned.
 */
@SpringBootTest
@Testcontainers
@DisplayName("Current permission persistence and withdrawal")
class PermissionPersistenceIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private JdbcTemplate sql;
  @Autowired private AccountStore accounts;
  @Autowired private AccountAccess accountAccess;
  @Autowired private CurrentPermissions permissions;
  @Autowired private ActionAuthorization authorization;
  @Autowired private SportingStore sporting;
  @Autowired private PlatformTransactionManager transactions;
  private TransactionTemplate transaction;
  private Account account;

  /**
   * Applies the actual disposable baseline before native Hibernate validation.
   *
   * @param properties isolated application connection settings
   * @throws Exception if migrations fail
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Recreates only disposable fixture state; new accounts start with no permission rows. */
  @BeforeEach
  void prepareAccount() {
    sql.update("DELETE FROM account");
    sql.update("DELETE FROM sporting_season");
    transaction = new TransactionTemplate(transactions);
    account =
        transaction.execute(
            state ->
                accounts.create(
                    ISSUER, "auth0|operator", "Operator_152", "operator@example.invalid", null));
  }

  @ParameterizedTest
  @CsvSource({
    "maintenance.manage, MANAGE_MAINTENANCE",
    "application-versions.manage, MANAGE_APPLICATION_VERSIONS",
    "maintenance.bypass, BYPASS_MAINTENANCE",
    "sporting-presentation.manage, MANAGE_SPORTING_PRESENTATION",
    "sporting-classification.manage, MANAGE_SPORTING_CLASSIFICATION",
    "division-lifecycle.manage, MANAGE_DIVISION_LIFECYCLE",
    "collection.manage, MANAGE_COLLECTION",
    "stream-links.moderate, MODERATE_STREAM_LINKS"
  })
  @DisplayName("Reads each assigned action only for its original account")
  void readsCurrentAssignments(String action, Permission expected) {
    // Given
    Account other =
        transaction.execute(
            state ->
                accounts.create(ISSUER, "auth0|other", "Other_152", "other@example.invalid", null));
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, ?), (?, ?)",
        account.id(),
        action,
        other.id(),
        "application-versions.manage");

    // When
    Set<Permission> result = permissions.forAccount(account.id());

    // Then
    assertThat(result).containsExactly(expected);
    assertThat(permissions.forAccount(other.id()))
        .containsExactly(Permission.MANAGE_APPLICATION_VERSIONS);
  }

  @Test
  @DisplayName(
      "A new account receives no privileges from role-like or entitlement-like identifiers")
  void grantsNoImplicitPrivilege() {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'admin'), (?, 'pro')",
        account.id(),
        account.id());

    // When
    Set<Permission> result = permissions.forAccount(account.id());

    // Then
    assertThat(result).isEmpty();
    assertThatThrownBy(
            () ->
                transaction.executeWithoutResult(
                    state -> authorization.require(account.id(), Permission.MANAGE_MAINTENANCE)))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Enforces unique account-action associations in PostgreSQL")
  void rejectsDuplicateGrant() {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'maintenance.manage')",
        account.id());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable duplicate =
        () ->
            sql.update(
                "INSERT INTO account_permission(account_id, permission) VALUES (?, 'maintenance.manage')",
                account.id());

    // Then
    assertThatThrownBy(duplicate)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("pk_account_permission");
  }

  @Test
  @DisplayName("Refuses an association without an active account lifecycle")
  void rejectsMissingAccount() {
    // Given
    UUID absent = UUID.fromString("00000000-0000-4000-8000-000000000999");

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable orphan =
        () ->
            sql.update(
                "INSERT INTO account_permission(account_id, permission) VALUES (?, 'maintenance.manage')",
                absent);

    // Then
    assertThatThrownBy(orphan)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("fk_account_permission_account");
    assertThat(permissions.forAccount(absent)).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Erasure removes grants without transferring them to a recreated principal")
  void removesErasedAccountGrants(boolean recreate) {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'maintenance.manage')",
        account.id());

    // When
    transaction.executeWithoutResult(
        state -> {
          accountAccess.lock(account.id());
          sql.update("DELETE FROM account WHERE id = ?", account.id());
        });
    Account replacement = null;
    if (recreate) {
      replacement =
          transaction.execute(
              state ->
                  accounts.create(
                      ISSUER, "auth0|operator", "Operator_152", "operator@example.invalid", null));
    }

    // Then
    if (replacement != null) {
      assertThat(replacement.id()).isNotEqualTo(account.id());
      assertThat(permissions.forAccount(replacement.id())).isEmpty();
    }
    assertThat(sql.queryForObject("SELECT count(*) FROM account_permission", Long.class)).isZero();
    assertThat(permissions.forAccount(account.id())).isEmpty();
    assertThatThrownBy(
            () ->
                transaction.executeWithoutResult(
                    state -> authorization.require(account.id(), Permission.MANAGE_MAINTENANCE)))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Requires the caller's transaction for a protected mutation")
  void requiresCallerTransaction() {
    // Given
    UUID original = account.id();

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable check =
        () -> authorization.require(original, Permission.MANAGE_MAINTENANCE);

    // Then
    assertThatThrownBy(check).isInstanceOf(IllegalTransactionStateException.class);
  }

  @Test
  @DisplayName(
      "A withdrawal ordered first refuses the waiting mutation despite its earlier projection")
  void refusesMutationAfterWithdrawal() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        account.id());
    SeasonView season = transaction.execute(state -> sporting.createSeason(2026, "Original"));
    CompletableFuture<Integer> mutationPid = new CompletableFuture<>();

    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> mutation =
          transaction.execute(
              state -> {
                // The manual operator takes only the account lock, never a sporting root.
                sql.queryForObject(
                    "SELECT id FROM account WHERE id = ? FOR UPDATE", UUID.class, account.id());
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                write -> {
                                  sporting.lockSeason(season.id());
                                  assertThat(permissions.forAccount(account.id()))
                                      .contains(Permission.MANAGE_COLLECTION);
                                  mutationPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  authorization.require(account.id(), Permission.MANAGE_COLLECTION);
                                  sql.update(
                                      "UPDATE sporting_season SET label = 'Changed' WHERE id = ?",
                                      season.id());
                                }));
                PostgresTestDatabase.awaitBlocked(sql, mutationPid);
                sql.update(
                    "DELETE FROM account_permission WHERE account_id = ? AND permission = 'collection.manage'",
                    account.id());
                return pending;
              });

      // Then
      assertThatThrownBy(() -> mutation.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccessDeniedException.class);
      assertThat(sporting.season(season.id()).orElseThrow().label()).isEqualTo("Original");
      assertThat(permissions.forAccount(account.id())).isEmpty();
    }
  }

  @Test
  @DisplayName("An authorized mutation commits before a waiting manual withdrawal")
  void finishesMutationBeforeWithdrawal() throws Exception {
    // Given
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'collection.manage')",
        account.id());
    SeasonView season = transaction.execute(state -> sporting.createSeason(2026, "Original"));
    CompletableFuture<Integer> withdrawalPid = new CompletableFuture<>();

    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> withdrawal =
          transaction.execute(
              state -> {
                sporting.lockSeason(season.id());
                authorization.require(account.id(), Permission.MANAGE_COLLECTION);
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
                                      account.id());
                                  sql.update(
                                      "DELETE FROM account_permission WHERE account_id = ? AND permission = 'collection.manage'",
                                      account.id());
                                }));
                PostgresTestDatabase.awaitBlocked(sql, withdrawalPid);
                sql.update(
                    "UPDATE sporting_season SET label = 'Changed' WHERE id = ?", season.id());
                return pending;
              });
      withdrawal.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(sporting.season(season.id()).orElseThrow().label()).isEqualTo("Changed");
      assertThat(permissions.forAccount(account.id())).isEmpty();
    }
  }
}
