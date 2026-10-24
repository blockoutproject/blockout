package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.application.PermissionStore;
import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * Exercises the concrete F07 policy through F12's real current-maintenance reader. Settings
 * storage, transactions and handoffs are controlled; these cases do not qualify SQL freshness,
 * inbox/purge implementation or an actual Expo send. F12's PostgreSQL suite owns the read's
 * transaction proof.
 */
@DisplayName("Sporting push maintenance admission")
class MaintenancePushAdmissionTest {
  private final AccessSettingsStore settings = mock(AccessSettingsStore.class);
  private final AccountAccess accounts = mock(AccountAccess.class);
  private final PermissionStore permissions = mock(PermissionStore.class);
  private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
  private MaintenanceAdmission maintenance;
  private SportingPushAdmission admission;

  /** Constructs the actual F12 reader and F07 policy with only external boundaries controlled. */
  @BeforeEach
  void createAdmission() {
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
    maintenance =
        new MaintenanceAdmission(
            settings,
            accounts,
            new ActionAuthorization(accounts, new CurrentPermissions(permissions)),
            transactions);
    admission = new SportingPushAdmission(maintenance);
  }

  @Test
  @DisplayName("Admits an ordinary handoff when current maintenance is inactive")
  void admitsInactiveMaintenance() {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(3, false, "Pause", null));
    Runnable handoff = mock(Runnable.class);

    // When
    attempt(handoff);

    // Then
    verify(handoff).run();
  }

  @Test
  @DisplayName("Skips an ordinary recipient during current maintenance")
  void skipsOrdinaryRecipient() {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(4, true, "Pause", null));
    Runnable handoff = mock(Runnable.class);

    // When
    attempt(handoff);

    // Then
    verifyNoInteractions(handoff, accounts, permissions);
  }

  @Test
  @DisplayName("Skips an operator whose current personal maintenance bypass is admitted")
  void skipsBypassRecipient() {
    // Given
    UUID operator = UUID.fromString("00000000-0000-4000-8000-000000000268");
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(4, true, "Pause", null));
    when(accounts.currentId("https://identity.example.invalid/", "operator"))
        .thenReturn(Optional.of(operator));
    when(accounts.lock(operator)).thenReturn(true);
    when(permissions.findByAccountId(operator)).thenReturn(Set.of(Permission.BYPASS_MAINTENANCE));
    assertThat(
            maintenance.requireOrdinaryAccess(
                "https://identity.example.invalid/", "operator", true))
        .contains(operator);
    Runnable handoff = mock(Runnable.class);

    // When
    attempt(handoff);

    // Then
    verifyNoInteractions(handoff);
  }

  @Test
  @DisplayName("Rechecks maintenance for the next handoff after an earlier admission")
  void skipsAfterEarlierAdmission() {
    // Given
    when(settings.maintenance())
        .thenReturn(
            new MaintenanceSettings(3, false, "Pause", null),
            new MaintenanceSettings(4, true, "Pause", null));
    Runnable earlier = mock(Runnable.class);
    Runnable next = mock(Runnable.class);
    attempt(earlier);

    // When
    attempt(next);

    // Then
    verify(earlier).run();
    verifyNoInteractions(next);
  }

  @Test
  @DisplayName("Leaves a previously admitted handoff free to finish after activation")
  void preservesAdmittedHandoff() {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(3, false, "Pause", null));
    boolean admitted = admission.allowsHandoff();
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(4, true, "Pause", null));
    Runnable alreadyAdmitted = mock(Runnable.class);
    Runnable next = mock(Runnable.class);

    // When
    if (admitted) alreadyAdmitted.run();
    attempt(next);

    // Then
    verify(alreadyAdmitted).run();
    verifyNoInteractions(next);
  }

  @Test
  @DisplayName("Reads maintenance without mutating settings or consulting account privileges")
  void keepsAdmissionReadOnly() {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(4, true, "Pause", null));

    // When
    boolean allowed = admission.allowsHandoff();

    // Then
    assertThat(allowed).isFalse();
    verify(settings).maintenance();
    verifyNoMoreInteractions(settings);
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Reopening admits a new handoff without replaying the skipped handoff")
  void admitsNewHandoffWithoutReplay() {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(4, true, "Pause", null));
    Runnable skipped = mock(Runnable.class);
    attempt(skipped);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(5, false, "Pause", null));
    Runnable newEvent = mock(Runnable.class);

    // When
    attempt(newEvent);

    // Then
    verifyNoInteractions(skipped);
    verify(newEvent).run();
    verifyNoMoreInteractions(newEvent);
  }

  @Test
  @DisplayName("Unavailable current state prevents handoff even after an earlier admission")
  void failsClosedAfterEarlierAdmission() {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(3, false, "Pause", null));
    assertThat(admission.allowsHandoff()).isTrue();
    DataAccessResourceFailureException failure =
        new DataAccessResourceFailureException("Synthetic unavailable storage");
    when(settings.maintenance()).thenThrow(failure);
    Runnable handoff = mock(Runnable.class);

    // When
    ThrowingCallable attempt = () -> attempt(handoff);

    // Then
    assertThatThrownBy(attempt)
        .isInstanceOf(AccessSettingsUnavailableException.class)
        .hasCause(failure);
    verifyNoInteractions(handoff);
  }

  /**
   * Models only the future sender's immediate check followed by controlled provider I/O. It owns no
   * inbox, purge, recipient eligibility, provider implementation or deferred work.
   *
   * @param handoff controlled handoff for this one attempt, discarded if maintenance is active
   */
  private void attempt(Runnable handoff) {
    if (admission.allowsHandoff()) handoff.run();
  }
}
