package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * Age decisions with controlled provider/store lifecycles; SQL and real cleanup are separate
 * proofs.
 */
@DisplayName("Trustworthy principal account age")
class EstablishAccountAgeTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final String SUBJECT = "auth0|principal";
  private static final UUID ORIGINAL = UUID.fromString("00000000-0000-4000-8000-000000000172");
  private static final UUID REPLACEMENT = UUID.fromString("00000000-0000-4000-8000-000000000173");
  private static final Instant HISTORICAL = Instant.parse("2020-01-02T03:04:05Z");
  private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
  private final ReadAccount reads = mock(ReadAccount.class);

  /** Executes explicit capture/write callbacks without claiming real transaction behavior. */
  @BeforeEach
  void supplyTransactions() {
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Preserves known age when provider evidence is absent or unavailable")
  void preservesKnownAge(boolean outage) {
    // Given
    Account original = account(ORIGINAL, HISTORICAL);
    AccountStore accounts = mock(AccountStore.class);
    PrincipalReader provider = mock(PrincipalReader.class);
    when(accounts.findIdByPrincipal(ISSUER, SUBJECT)).thenReturn(Optional.of(original.id()));
    when(accounts.synchronize(ORIGINAL, null, null)).thenReturn(Optional.of(original));
    when(reads.original(ISSUER, SUBJECT, ORIGINAL))
        .thenReturn(new ReadAccount.View(original, false, Set.of()));
    if (outage) when(provider.read(ISSUER, SUBJECT)).thenThrow(new AccountUnavailableException());
    else
      when(provider.read(ISSUER, SUBJECT))
          .thenReturn(new PrincipalReader.Evidence(null, null, List.of()));
    EstablishAccount establishment = new EstablishAccount(accounts, provider, reads, transactions);

    // When
    EstablishAccount.Outcome result = establishment.establish(ISSUER, SUBJECT);

    // Then
    assertThat(result.created()).isFalse();
    assertThat(result.view().account().principalCreatedAt()).isEqualTo(HISTORICAL);
    verify(accounts).synchronize(ORIGINAL, null, null);
  }

  @Test
  @DisplayName("Leaves first establishment age unknown when the principal has no date")
  void leavesMissingAgeUnknown() {
    // Given
    AccountStore accounts = mock(AccountStore.class);
    PrincipalReader provider = mock(PrincipalReader.class);
    when(accounts.findIdByPrincipal(ISSUER, SUBJECT)).thenReturn(Optional.empty());
    when(provider.read(ISSUER, SUBJECT))
        .thenReturn(new PrincipalReader.Evidence("owner@example.invalid", null, List.of()));
    when(accounts.create(eq(ISSUER), eq(SUBJECT), any(), eq("owner@example.invalid"), eq(null)))
        .thenReturn(account(ORIGINAL, null));
    when(reads.original(ISSUER, SUBJECT, ORIGINAL))
        .thenReturn(new ReadAccount.View(account(ORIGINAL, null), false, Set.of()));
    EstablishAccount establishment = new EstablishAccount(accounts, provider, reads, transactions);

    // When
    EstablishAccount.Outcome result = establishment.establish(ISSUER, SUBJECT);

    // Then
    assertThat(result.created()).isTrue();
    assertThat(result.view().account().principalCreatedAt()).isNull();
    verify(accounts).create(eq(ISSUER), eq(SUBJECT), any(), eq("owner@example.invalid"), eq(null));
  }

  @Test
  @DisplayName("Recovers missing age through a later explicit establishment")
  void recoversMissingAge() {
    // Given
    Account original = account(ORIGINAL, null);
    AccountStore accounts = mock(AccountStore.class);
    PrincipalReader provider = mock(PrincipalReader.class);
    when(accounts.findIdByPrincipal(ISSUER, SUBJECT)).thenReturn(Optional.of(original.id()));
    when(provider.read(ISSUER, SUBJECT))
        .thenThrow(new AccountUnavailableException())
        .thenReturn(new PrincipalReader.Evidence(null, HISTORICAL, List.of()));
    when(accounts.synchronize(ORIGINAL, null, null)).thenReturn(Optional.of(original));
    when(accounts.synchronize(ORIGINAL, null, HISTORICAL))
        .thenReturn(Optional.of(account(ORIGINAL, HISTORICAL)));
    when(reads.original(ISSUER, SUBJECT, ORIGINAL))
        .thenReturn(
            new ReadAccount.View(original, false, Set.of()),
            new ReadAccount.View(account(ORIGINAL, HISTORICAL), false, Set.of()));
    EstablishAccount establishment = new EstablishAccount(accounts, provider, reads, transactions);

    // When
    Account unavailable = establishment.establish(ISSUER, SUBJECT).view().account();
    Account recovered = establishment.establish(ISSUER, SUBJECT).view().account();

    // Then
    assertThat(unavailable.principalCreatedAt()).isNull();
    assertThat(recovered.id()).isEqualTo(ORIGINAL);
    assertThat(recovered.principalCreatedAt()).isEqualTo(HISTORICAL);
    verify(accounts).synchronize(ORIGINAL, null, HISTORICAL);
  }

  @ParameterizedTest
  @org.junit.jupiter.params.provider.CsvSource({
    "auth0|principal,2020-01-02T03:04:05Z",
    "auth0|recreated,2026-10-22T10:00:00Z"
  })
  @DisplayName("Uses the surviving or recreated principal date for a new business registration")
  void usesActualPrincipalAfterCleanup(String currentSubject, Instant currentPrincipalDate) {
    // Given
    // Prior cleanup supplies this current provider principal; deletion is not exercised here.
    AccountStore accounts = mock(AccountStore.class);
    PrincipalReader provider = mock(PrincipalReader.class);
    when(accounts.findIdByPrincipal(ISSUER, currentSubject)).thenReturn(Optional.empty());
    when(provider.read(ISSUER, currentSubject))
        .thenReturn(
            new PrincipalReader.Evidence("owner@example.invalid", currentPrincipalDate, List.of()));
    Account replacement =
        new Account(
            REPLACEMENT,
            ISSUER,
            currentSubject,
            "New_profile",
            "owner@example.invalid",
            currentPrincipalDate);
    when(accounts.create(
            eq(ISSUER),
            eq(currentSubject),
            any(),
            eq("owner@example.invalid"),
            eq(currentPrincipalDate)))
        .thenReturn(replacement);
    when(reads.original(ISSUER, currentSubject, REPLACEMENT))
        .thenReturn(new ReadAccount.View(replacement, false, Set.of()));
    EstablishAccount establishment = new EstablishAccount(accounts, provider, reads, transactions);

    // When
    EstablishAccount.Outcome result = establishment.establish(ISSUER, currentSubject);

    // Then
    assertThat(result.created()).isTrue();
    assertThat(result.view().account().id()).isNotEqualTo(ORIGINAL);
    assertThat(result.view().account().principalCreatedAt()).isEqualTo(currentPrincipalDate);
    verify(accounts)
        .create(
            eq(ISSUER),
            eq(currentSubject),
            any(),
            eq("owner@example.invalid"),
            eq(currentPrincipalDate));
  }

  /**
   * Builds an immutable account snapshot with scenario-owned age; it contains no business age
   * clock.
   *
   * @param id lifecycle under test
   * @param createdAt actual provider evidence, or null
   * @return a minimal usable profile
   */
  private static Account account(UUID id, Instant createdAt) {
    return new Account(id, ISSUER, SUBJECT, "Chosen_name", "owner@example.invalid", createdAt);
  }
}
