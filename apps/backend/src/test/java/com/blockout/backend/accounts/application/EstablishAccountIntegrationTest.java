package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Real service/transaction/JPA evidence with a controlled provider, not an Auth0 qualification. */
@SpringBootTest
@DisplayName("Explicit account establishment transactions")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EstablishAccountIntegrationTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final Instant CREATED = Instant.parse("2020-01-02T03:04:05Z");
  @Autowired private EstablishAccount establishment;
  @Autowired private ChangeAccountProfile profileChanges;
  @MockitoSpyBean private AccountStore accounts;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private PrincipalReader provider;
  private TransactionTemplate transaction;

  /** Clears only disposable test accounts; provider behavior is configured by each scenario. */
  @BeforeEach
  void prepare() {
    sql.update("DELETE FROM account");
    transaction = new TransactionTemplate(transactions);
  }

  @Test
  @DisplayName("Settles concurrent explicit establishment through PostgreSQL uniqueness")
  void settlesConcurrentEstablishment() throws Exception {
    // Given
    CyclicBarrier fetched = new CyclicBarrier(2);
    when(provider.read(ISSUER, "auth0|one"))
        .thenAnswer(
            call -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              fetched.await(10, TimeUnit.SECONDS);
              return new PrincipalReader.Evidence("shared@example.invalid", CREATED, List.of());
            });

    // When
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<EstablishAccount.Outcome> first =
          workers.submit(() -> establishment.establish(ISSUER, "auth0|one"));
      Future<EstablishAccount.Outcome> second =
          workers.submit(() -> establishment.establish(ISSUER, "auth0|one"));
      List<EstablishAccount.Outcome> outcomes =
          List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(outcomes.stream().map(result -> result.view().account().id()).distinct())
          .hasSize(1);
      assertThat(outcomes.stream().filter(EstablishAccount.Outcome::created)).hasSize(1);
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(1L);
      Account account = outcomes.getFirst().view().account();
      assertThat(account.username()).matches("[A-Za-z0-9._-]{3,32}");
      assertThat(account.principalCreatedAt()).isEqualTo(CREATED);
      assertThat(accounts.hasPhoto(account.id())).isFalse();
    }
  }

  @Test
  @DisplayName("Preserves the concurrent winner's profile when synchronizing provider evidence")
  void preservesConcurrentWinnerProfile() {
    // Given
    when(provider.read(ISSUER, "auth0|one"))
        .thenAnswer(
            call -> {
              transaction.executeWithoutResult(
                  status ->
                      accounts.create(
                          ISSUER, "auth0|one", "Initial_name", "initial@example.invalid", CREATED));
              return new PrincipalReader.Evidence("updated@example.invalid", CREATED, List.of());
            });
    AccountStore target = AopTestUtils.getUltimateTargetObject(accounts);
    doAnswer(
            call -> {
              TransactionTemplate competing = new TransactionTemplate(transactions);
              competing.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
              competing.executeWithoutResult(
                  status ->
                      profileChanges.change(
                          ISSUER, "auth0|one", call.getArgument(0), "Chosen_name", null, null));
              return call.callRealMethod();
            })
        .when(target)
        .synchronize(any(UUID.class), eq("updated@example.invalid"), eq(CREATED));

    // When
    EstablishAccount.Outcome result = establishment.establish(ISSUER, "auth0|one");

    // Then
    assertThat(result.created()).isFalse();
    Account persisted = accounts.findById(result.view().account().id()).orElseThrow();
    assertThat(persisted.username()).isEqualTo("Chosen_name");
    assertThat(persisted.email()).isEqualTo("updated@example.invalid");
    assertThat(result.view().account().username()).isEqualTo("Chosen_name");
  }

  @Test
  @DisplayName("Keeps principals distinct when provider email is identical")
  void keepsSharedEmailSeparate() {
    // Given
    when(provider.read(anyString(), anyString()))
        .thenReturn(new PrincipalReader.Evidence("shared@example.invalid", null, List.of()));

    // When
    Account first = establishment.establish(ISSUER, "auth0|one").view().account();
    Account second = establishment.establish(ISSUER, "auth0|One").view().account();

    // Then
    assertThat(first.id()).isNotEqualTo(second.id());
    assertThat(first.email()).isEqualTo(second.email());
    assertThat(first.username()).isNotEqualTo(second.username());
    assertThat(first.principalCreatedAt()).isNull();
  }

  @Test
  @DisplayName("Generates a new neutral candidate after a real case-insensitive name collision")
  void retriesNeutralNameCollision() {
    // Given
    when(provider.read(ISSUER, "auth0|one"))
        .thenReturn(new PrincipalReader.Evidence("shared@example.invalid", CREATED, List.of()));
    AtomicBoolean collide = new AtomicBoolean(true);
    UUID competitor = UUID.randomUUID();
    AccountStore target = AopTestUtils.getUltimateTargetObject(accounts);
    doAnswer(
            call -> {
              if (collide.getAndSet(false)) {
                TransactionTemplate competing = new TransactionTemplate(transactions);
                competing.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                competing.executeWithoutResult(
                    status ->
                        sql.update(
                            "INSERT INTO account (id, issuer, subject, username, email) VALUES (?, ?, ?, ?, ?)",
                            competitor,
                            ISSUER,
                            "auth0|competitor",
                            call.<String>getArgument(2).toUpperCase(Locale.ROOT),
                            "competitor@example.invalid"));
              }
              return call.callRealMethod();
            })
        .when(target)
        .create(eq(ISSUER), eq("auth0|one"), anyString(), anyString(), any());

    // When
    Account created = establishment.establish(ISSUER, "auth0|one").view().account();

    // Then
    assertThat(created.id()).isNotEqualTo(competitor);
    assertThat(created.username())
        .isNotEqualToIgnoringCase(accounts.findById(competitor).orElseThrow().username());
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(2L);
  }

  @Test
  @DisplayName("Rejects missing first email without committing partial data")
  void rejectsMissingInitialEmail() {
    // Given
    when(provider.read(ISSUER, "auth0|one"))
        .thenReturn(new PrincipalReader.Evidence(null, CREATED, List.of()));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable establish =
        () -> establishment.establish(ISSUER, "auth0|one");

    // Then
    assertThatThrownBy(establish).isInstanceOf(ProviderEmailUnavailableException.class);
    assertThat(accounts.findByPrincipal(ISSUER, "auth0|one")).isEmpty();
  }

  @Test
  @DisplayName("Retains known profile evidence during provider unavailability")
  void retainsKnownEvidenceOnFailure() {
    // Given
    Account original =
        transaction.execute(
            status ->
                accounts.create(
                    ISSUER, "auth0|one", "Chosen_name", "known@example.invalid", CREATED));
    when(provider.read(ISSUER, "auth0|one"))
        .thenAnswer(
            call -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              throw new AccountUnavailableException();
            });

    // When
    EstablishAccount.Outcome result = establishment.establish(ISSUER, "auth0|one");

    // Then
    assertThat(result.created()).isFalse();
    assertThat(result.view().account()).isEqualTo(original);
    assertThat(accounts.findById(original.id())).contains(original);
  }

  @Test
  @DisplayName("Reads photo presence independently from the identity and original-row lock")
  void readsPhotoPresence() {
    // Given
    Account original =
        transaction.execute(
            status ->
                accounts.create(
                    ISSUER, "auth0|photo", "Photo_owner", "known@example.invalid", CREATED));
    // Synthetic storage bytes exercise presence only; actual image validation belongs to US2.
    sql.update(
        "UPDATE account SET photo_bytes = ?, photo_media_type = 'image/png', photo_dimension = 1 WHERE id = ?",
        new byte[] {1, 2, 3},
        original.id());

    // When
    Account read = accounts.findByPrincipal(ISSUER, "auth0|photo").orElseThrow();
    Account locked = transaction.execute(status -> accounts.lockById(original.id()).orElseThrow());

    // Then
    assertThat(read).isEqualTo(original);
    assertThat(locked).isEqualTo(original);
    assertThat(accounts.hasPhoto(original.id())).isTrue();
    assertThat(accounts.hasPhoto(UUID.randomUUID())).isFalse();
  }

  @Test
  @DisplayName("Returns current photo presence and grants with the established original account")
  void returnsCurrentProjection() {
    // Given
    Account original =
        transaction.execute(
            status ->
                accounts.create(ISSUER, "auth0|one", "Original", "known@example.invalid", CREATED));
    sql.update(
        "UPDATE account SET photo_bytes = ?, photo_media_type = 'image/png', photo_dimension = 1 WHERE id = ?",
        new byte[] {1, 2, 3},
        original.id());
    sql.update(
        "INSERT INTO account_permission (account_id, permission) VALUES (?, 'maintenance.manage')",
        original.id());
    when(provider.read(ISSUER, "auth0|one"))
        .thenReturn(new PrincipalReader.Evidence("current@example.invalid", CREATED, List.of()));

    // When
    ReadAccount.View view = establishment.establish(ISSUER, "auth0|one").view();

    // Then
    assertThat(view.account().id()).isEqualTo(original.id());
    assertThat(view.account().email()).isEqualTo("current@example.invalid");
    assertThat(view.hasPhoto()).isTrue();
    assertThat(view.permissions()).containsExactly(Permission.MANAGE_MAINTENANCE);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Keeps a committed establishment unavailable when its original is erased before projection")
  void refusesErasureAfterCommit(boolean recreate) {
    // Given
    Account original =
        transaction.execute(
            status ->
                accounts.create(ISSUER, "auth0|one", "Original", "known@example.invalid", CREATED));
    when(provider.read(ISSUER, "auth0|one"))
        .thenReturn(new PrincipalReader.Evidence("committed@example.invalid", CREATED, List.of()));
    AccountStore target = AopTestUtils.getUltimateTargetObject(accounts);
    doAnswer(
            call -> {
              TransactionTemplate competing = new TransactionTemplate(transactions);
              competing.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
              competing.executeWithoutResult(
                  status -> {
                    assertThat(
                            sql.queryForObject(
                                "SELECT email FROM account WHERE id = ?",
                                String.class,
                                original.id()))
                        .isEqualTo("committed@example.invalid");
                    sql.update("DELETE FROM account WHERE id = ?", original.id());
                    if (recreate)
                      accounts.create(
                          ISSUER,
                          "auth0|one",
                          "Replacement",
                          "replacement@example.invalid",
                          CREATED);
                  });
              return call.callRealMethod();
            })
        .when(target)
        .findById(original.id());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable establish =
        () -> establishment.establish(ISSUER, "auth0|one");

    // Then
    assertThatThrownBy(establish).isInstanceOf(AccountUnavailableException.class);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM account WHERE id = ?", Long.class, original.id()))
        .isZero();
    Optional<Account> replacement = accounts.findByPrincipal(ISSUER, "auth0|one");
    if (recreate) {
      assertThat(replacement.orElseThrow().id()).isNotEqualTo(original.id());
      assertThat(replacement.orElseThrow().email()).isEqualTo("replacement@example.invalid");
    } else assertThat(replacement).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Does not create or synchronize a replacement when the captured lifecycle disappears")
  void refusesErasedOriginal(boolean recreate) {
    // Given
    Account original =
        transaction.execute(
            status ->
                accounts.create(ISSUER, "auth0|one", "Original", "known@example.invalid", CREATED));
    when(provider.read(ISSUER, "auth0|one"))
        .thenAnswer(
            call -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              sql.update("DELETE FROM account WHERE id = ?", original.id());
              if (recreate)
                transaction.execute(
                    status ->
                        accounts.create(
                            ISSUER,
                            "auth0|one",
                            "Replacement",
                            "replacement@example.invalid",
                            CREATED));
              return new PrincipalReader.Evidence("late@example.invalid", null, List.of());
            });

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable establish =
        () -> establishment.establish(ISSUER, "auth0|one");

    // Then
    assertThatThrownBy(establish).isInstanceOf(AccountUnavailableException.class);
    assertThat(accounts.findById(original.id())).isEmpty();
    Optional<Account> replacement = accounts.findByPrincipal(ISSUER, "auth0|one");
    if (recreate) {
      assertThat(replacement.orElseThrow().email()).isEqualTo("replacement@example.invalid");
      assertThat(replacement.orElseThrow().id()).isNotEqualTo(original.id());
    } else assertThat(replacement).isEmpty();
  }
}
