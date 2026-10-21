package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
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
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Verifies the account persistence boundary against the actual migrated PostgreSQL schema. */
@SpringBootTest
@Testcontainers
@DisplayName("Account establishment persistence")
class AccountEstablishmentIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final Instant PRINCIPAL_CREATED = Instant.parse("2020-01-02T03:04:05Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private AccountStore accounts;
  @Autowired private AccountAccess access;
  @Autowired private PlatformTransactionManager transactions;
  private TransactionTemplate transaction;

  /**
   * Applies the disposable baseline before Hibernate validates the restricted application role.
   *
   * @param properties native test configuration
   * @throws Exception if migration fails
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Clears only this suite's disposable accounts and uses ordinary caller-owned transactions. */
  @BeforeEach
  void prepareAccounts() {
    sql.update("DELETE FROM account");
    transaction = new TransactionTemplate(transactions);
  }

  @ParameterizedTest
  @CsvSource({
    "auth0|one, Player_145, uk_account_principal",
    "auth0|two, pLAYER_144, uk_account_username"
  })
  @DisplayName("Allows only one competing creation for a principal or case-insensitive username")
  void settlesConcurrentCreation(String otherSubject, String otherUsername, String constraint)
      throws Exception {
    // Given
    CyclicBarrier ready = new CyclicBarrier(2);

    // When
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<Account> first =
          workers.submit(
              () -> {
                ready.await(10, TimeUnit.SECONDS);
                return transaction.execute(
                    state ->
                        accounts.create(
                            ISSUER, "auth0|one", "Player_144", "shared@example.invalid", null));
              });
      Future<Account> second =
          workers.submit(
              () -> {
                ready.await(10, TimeUnit.SECONDS);
                return transaction.execute(
                    state ->
                        accounts.create(
                            ISSUER, otherSubject, otherUsername, "shared@example.invalid", null));
              });
      List<Object> outcomes = List.of(outcome(first), outcome(second));

      // Then
      assertThat(outcomes.stream().filter(Account.class::isInstance)).hasSize(1);
      List<Object> failures = outcomes.stream().filter(Throwable.class::isInstance).toList();
      assertThat(failures)
          .singleElement()
          .isInstanceOfSatisfying(
              DataIntegrityViolationException.class,
              failure -> assertThat(failure).hasStackTraceContaining(constraint));
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(1L);
    }
  }

  @Test
  @DisplayName("Keeps exact principals distinct even when they share an email")
  void separatesPrincipalsSharingEmail() {
    // Given
    Account first =
        transaction.execute(
            state ->
                accounts.create(
                    ISSUER,
                    "auth0|one",
                    "Player_144",
                    "shared@example.invalid",
                    PRINCIPAL_CREATED));
    Account second =
        transaction.execute(
            state ->
                accounts.create(ISSUER, "auth0|One", "Player_145", "shared@example.invalid", null));
    Account otherIssuer =
        transaction.execute(
            state ->
                accounts.create(
                    "https://other.example.invalid/",
                    "auth0|one",
                    "Player_146",
                    "SHARED@example.invalid",
                    null));

    // When
    Optional<UUID> current = access.currentId(ISSUER, "auth0|one");

    // Then
    assertThat(current).contains(first.id());
    assertThat(access.currentId(ISSUER, "auth0|One")).contains(second.id());
    assertThat(access.currentId("https://other.example.invalid/", "auth0|one"))
        .contains(otherIssuer.id());
    assertThat(List.of(first.id(), second.id(), otherIssuer.id())).doesNotHaveDuplicates();
    assertThat(accounts.findById(first.id())).contains(first);
    assertThat(accounts.findById(second.id()).orElseThrow().principalCreatedAt()).isNull();
  }

  @Test
  @DisplayName("Leaves an unknown principal absent on an ordinary read")
  void readsWithoutCreating() {
    // Given
    String unknown = "auth0|unknown";

    // When
    Optional<UUID> result = access.currentId(ISSUER, unknown);

    // Then
    assertThat(result).isEmpty();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isZero();
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" ", "not-an-email"})
  @DisplayName("Rejects an unusable initial provider email through native validation")
  void rejectsUnusableInitialEmail(String email) {
    // Given
    String subject = "auth0|unusable-email";

    // When
    ThrowingCallable create =
        () ->
            transaction.execute(
                state -> accounts.create(ISSUER, subject, "Player_144", email, null));

    // Then
    assertThatThrownBy(create).hasRootCauseInstanceOf(ConstraintViolationException.class);
    assertThat(accounts.findByPrincipal(ISSUER, subject)).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"ab", "a b", "équipe", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
  @DisplayName("Rejects usernames outside the shared ASCII and length rules")
  void rejectsInvalidUsername(String username) {
    // Given
    String subject = "auth0|invalid-name";

    // When
    ThrowingCallable create =
        () ->
            transaction.execute(
                state ->
                    accounts.create(ISSUER, subject, username, "player@example.invalid", null));

    // Then
    assertThatThrownBy(create).hasRootCauseInstanceOf(ConstraintViolationException.class);
    assertThat(accounts.findByPrincipal(ISSUER, subject)).isEmpty();
  }

  @Test
  @DisplayName("Trims outer username whitespace before validating and persisting it")
  void normalizesUsername() {
    // Given
    String username = " \t Player_144.- \n";

    // When
    Account created =
        transaction.execute(
            state ->
                accounts.create(ISSUER, "auth0|one", username, "player@example.invalid", null));

    // Then
    assertThat(created.username()).isEqualTo("Player_144.-");
    assertThat(accounts.findById(created.id()).orElseThrow().username()).isEqualTo("Player_144.-");
  }

  @Test
  @DisplayName("Preserves known email and principal age when provider evidence is unavailable")
  void preservesKnownEvidence() {
    // Given
    Account original =
        transaction.execute(
            state ->
                accounts.create(
                    ISSUER,
                    "auth0|one",
                    "Chosen_name",
                    "known@example.invalid",
                    PRINCIPAL_CREATED));

    // When
    Optional<Account> result =
        transaction.execute(state -> accounts.synchronize(original.id(), null, null));

    // Then
    assertThat(result).contains(original);
    assertThat(accounts.findById(original.id())).contains(original);
  }

  @Test
  @DisplayName("Synchronizes available provider evidence without replacing the chosen username")
  void synchronizesAvailableEvidence() {
    // Given
    Account original =
        transaction.execute(
            state ->
                accounts.create(ISSUER, "auth0|one", "Chosen_name", "old@example.invalid", null));

    // When
    transaction.executeWithoutResult(
        state -> accounts.synchronize(original.id(), "current@example.invalid", PRINCIPAL_CREATED));

    // Then
    Account updated = accounts.findById(original.id()).orElseThrow();
    assertThat(updated.email()).isEqualTo("current@example.invalid");
    assertThat(updated.principalCreatedAt()).isEqualTo(PRINCIPAL_CREATED);
    assertThat(updated.username()).isEqualTo("Chosen_name");
    assertThat(updated.id()).isEqualTo(original.id());
  }

  @Test
  @DisplayName("Rolls back provider synchronization with the enclosing business transaction")
  void rollsBackSynchronization() {
    // Given
    Account original =
        transaction.execute(
            state ->
                accounts.create(
                    ISSUER,
                    "auth0|one",
                    "Chosen_name",
                    "known@example.invalid",
                    PRINCIPAL_CREATED));

    // When
    transaction.executeWithoutResult(
        state -> {
          accounts.synchronize(original.id(), "new@example.invalid", null);
          state.setRollbackOnly();
        });

    // Then
    assertThat(accounts.findById(original.id())).contains(original);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Never redirects delayed synchronization after original-account deletion")
  void doesNotSynchronizeReplacement(boolean recreate) throws Exception {
    // Given
    Account original =
        transaction.execute(
            state ->
                accounts.create(
                    ISSUER,
                    "auth0|one",
                    "Player_144",
                    "original@example.invalid",
                    PRINCIPAL_CREATED));
    CompletableFuture<Integer> synchronizingPid = new CompletableFuture<>();

    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<Optional<Account>> pending =
          transaction.execute(
              state -> {
                assertThat(access.lock(original.id())).isTrue();
                Future<Optional<Account>> synchronization =
                    worker.submit(
                        () ->
                            transaction.execute(
                                sync -> {
                                  synchronizingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return accounts.synchronize(
                                      original.id(), "late@example.invalid", null);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, synchronizingPid);
                sql.update("DELETE FROM account WHERE id = ?", original.id());
                if (recreate) {
                  accounts.create(
                      ISSUER,
                      "auth0|one",
                      "Replacement",
                      "replacement@example.invalid",
                      PRINCIPAL_CREATED);
                }
                return synchronization;
              });
      Optional<Account> result = pending.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(result).isEmpty();
      assertThat(accounts.findById(original.id())).isEmpty();
      Optional<Account> current = accounts.findByPrincipal(ISSUER, "auth0|one");
      if (recreate) {
        Account replacement = current.orElseThrow();
        assertThat(replacement.id()).isNotEqualTo(original.id());
        assertThat(replacement.email()).isEqualTo("replacement@example.invalid");
        assertThat(replacement.username()).isEqualTo("Replacement");
        assertThat(replacement.principalCreatedAt()).isEqualTo(PRINCIPAL_CREATED);
      } else {
        assertThat(current).isEmpty();
      }
    }
  }

  @Test
  @DisplayName("Refuses account locking without an enclosing business transaction")
  void requiresCallerTransaction() {
    // Given
    UUID original = UUID.fromString("00000000-0000-4000-8000-000000000144");

    // When
    ThrowingCallable lock = () -> access.lock(original);

    // Then
    assertThatThrownBy(lock).isInstanceOf(IllegalTransactionStateException.class);
  }

  @Test
  @DisplayName("Reports an absent original account to the caller holding the business transaction")
  void refusesAbsentOriginal() {
    // Given
    UUID original = UUID.fromString("00000000-0000-4000-8000-000000000144");

    // When
    Boolean present = transaction.execute(state -> access.lock(original));

    // Then
    assertThat(present).isFalse();
  }

  @Test
  @DisplayName("Stores photo bytes with the account and rolls them back atomically")
  void rollsBackPhotoStorage() {
    // Given
    Account original =
        transaction.execute(
            state ->
                accounts.create(ISSUER, "auth0|one", "Player_144", "player@example.invalid", null));
    // Synthetic bytes qualify storage only; actual image decoding belongs to profile validation.
    byte[] originalBytes = {1, 2, 3};
    sql.update(
        "UPDATE account SET photo_bytes = ?, photo_media_type = 'image/png', photo_dimension = 128 WHERE id = ?",
        originalBytes,
        original.id());

    // When
    transaction.executeWithoutResult(
        state -> {
          access.lock(original.id());
          sql.update(
              "UPDATE account SET photo_bytes = ?, photo_dimension = 256 WHERE id = ?",
              new byte[] {4, 5},
              original.id());
          state.setRollbackOnly();
        });

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT photo_bytes FROM account WHERE id = ?", byte[].class, original.id()))
        .isEqualTo(originalBytes);
    assertThat(
            sql.queryForObject(
                "SELECT photo_dimension FROM account WHERE id = ?", Integer.class, original.id()))
        .isEqualTo(128);
  }

  @ParameterizedTest
  @CsvSource({
    "image/png, 0, 1",
    "image/png, 1025, 1",
    "image/png, 1, 5242881",
    "image/gif, 1, 1",
    "image/png, 1, 0"
  })
  @DisplayName("Rejects photo storage outside its media, byte and square-dimension limits")
  void rejectsInvalidPhotoStorage(String mediaType, int dimension, int length) {
    // Given
    Account original =
        transaction.execute(
            state ->
                accounts.create(ISSUER, "auth0|one", "Player_144", "player@example.invalid", null));

    // When
    ThrowingCallable update =
        () ->
            sql.update(
                "UPDATE account SET photo_bytes = ?, photo_media_type = ?, photo_dimension = ? WHERE id = ?",
                new byte[length],
                mediaType,
                dimension,
                original.id());

    // Then
    assertThatThrownBy(update)
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasStackTraceContaining("ck_account_photo");
    assertThat(
            sql.queryForObject(
                "SELECT photo_bytes FROM account WHERE id = ?", byte[].class, original.id()))
        .isNull();
  }

  @Test
  @DisplayName("Rejects a missing initial email without persisting a partial account")
  void rejectsMissingInitialEmail() {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000144");

    // When
    ThrowingCallable create =
        () ->
            sql.update(
                "INSERT INTO account(id, issuer, subject, username) VALUES (?, ?, ?, ?)",
                id,
                "https://identity.example.invalid/",
                "auth0|missing-email",
                "Player_144");

    // Then
    assertThatThrownBy(create).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account WHERE id = ?", Long.class, id))
        .isZero();
  }

  /**
   * Returns a completed creation or its actual transaction failure for concurrency assertions.
   *
   * @param work submitted account creation
   * @return committed account or failure
   * @throws Exception if the bounded worker does not complete
   */
  private static Object outcome(Future<Account> work) throws Exception {
    try {
      return work.get(15, TimeUnit.SECONDS);
    } catch (ExecutionException failure) {
      return failure.getCause();
    }
  }
}
