package com.blockout.backend.access.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.PlatformTransactionManager;

/** Direct F12 admission decisions; transaction and PostgreSQL freshness have separate evidence. */
@DisplayName("Ordinary maintenance admission")
class MaintenanceAdmissionTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");

  @Test
  @DisplayName("Admits ordinary public reads without consulting a usable account or permissions")
  void admitsGuest() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    AccountAccess accounts = mock(AccountAccess.class);
    ActionAuthorization authorization = mock(ActionAuthorization.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings, accounts, authorization, mock(PlatformTransactionManager.class));

    // When
    Optional<UUID> result = admission.requireOrdinaryAccess(null, null, false);

    // Then
    assertThat(result).isEmpty();
    verifyNoInteractions(accounts, authorization);
  }

  @Test
  @DisplayName("Keeps explicit bypass subject to the current account grant")
  void rechecksBypassGrant() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    AccountAccess accounts = mock(AccountAccess.class);
    ActionAuthorization authorization = mock(ActionAuthorization.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, true, "Maintenance", null));
    when(accounts.currentId("https://identity.example.invalid/", "synthetic-subject"))
        .thenReturn(Optional.of(ID));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings, accounts, authorization, mock(PlatformTransactionManager.class));
    assertThat(
            admission.requireOrdinaryAccess(
                "https://identity.example.invalid/", "synthetic-subject", true))
        .contains(ID);
    doThrow(new AccessDeniedException("Refused"))
        .when(authorization)
        .require(ID, Permission.BYPASS_MAINTENANCE);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () ->
            admission.requireOrdinaryAccess(
                "https://identity.example.invalid/", "synthetic-subject", true);

    // Then
    assertThatThrownBy(read).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Refuses anonymous explicit bypass during maintenance")
  void refusesGuestBypass() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, true, "Maintenance", null));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings,
            mock(AccountAccess.class),
            mock(ActionAuthorization.class),
            mock(PlatformTransactionManager.class));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> admission.requireOrdinaryAccess(null, null, true);

    // Then
    assertThatThrownBy(read).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @DisplayName("Refuses an ordinary guest while maintenance is active")
  void refusesOrdinaryGuest() {
    // Given
    AccessSettingsStore settings = mock(AccessSettingsStore.class);
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, true, "Maintenance", null));
    MaintenanceAdmission admission =
        new MaintenanceAdmission(
            settings,
            mock(AccountAccess.class),
            mock(ActionAuthorization.class),
            mock(PlatformTransactionManager.class));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> admission.requireOrdinaryAccess(null, null, false);

    // Then
    assertThatThrownBy(read).isInstanceOf(MaintenanceRequiredException.class);
  }
}
