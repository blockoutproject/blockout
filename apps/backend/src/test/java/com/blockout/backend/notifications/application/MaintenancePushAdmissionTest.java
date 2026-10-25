package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Proves the sporting push decision at its F12 application boundary. Actual provider handoff,
 * replay, account bypass and PostgreSQL freshness are not implemented by this policy.
 */
@DisplayName("Sporting push maintenance admission")
class MaintenancePushAdmissionTest {
  private final MaintenanceAdmission maintenance = mock(MaintenanceAdmission.class);
  private final SportingPushAdmission admission = new SportingPushAdmission(maintenance);

  @ParameterizedTest
  @CsvSource({"false,true", "true,false"})
  @DisplayName("Admits a new sporting handoff only while current maintenance is inactive")
  void usesCurrentMaintenance(boolean active, boolean expectedAdmission) {
    // Given
    when(maintenance.currentMaintenance())
        .thenReturn(new MaintenanceSettings(3, active, "Pause", null));

    // When
    boolean allowed = admission.allowsHandoff();

    // Then
    assertThat(allowed).isEqualTo(expectedAdmission);
  }

  @Test
  @DisplayName("Refuses the next decision after maintenance activates")
  void rechecksActivation() {
    // Given
    when(maintenance.currentMaintenance())
        .thenReturn(
            new MaintenanceSettings(3, false, "Pause", null),
            new MaintenanceSettings(4, true, "Pause", null));

    // When
    boolean beforeActivation = admission.allowsHandoff();
    boolean afterActivation = admission.allowsHandoff();

    // Then
    assertThat(beforeActivation).isTrue();
    assertThat(afterActivation).isFalse();
  }

  @Test
  @DisplayName("Admits a new decision after maintenance ends")
  void rechecksReopening() {
    // Given
    when(maintenance.currentMaintenance())
        .thenReturn(
            new MaintenanceSettings(4, true, "Pause", null),
            new MaintenanceSettings(5, false, "Pause", null));

    // When
    boolean duringMaintenance = admission.allowsHandoff();
    boolean afterReopening = admission.allowsHandoff();

    // Then
    assertThat(duringMaintenance).isFalse();
    assertThat(afterReopening).isTrue();
  }

  @Test
  @DisplayName("Propagates unavailable current maintenance after an earlier admission")
  void refusesUnavailableCurrentState() {
    // Given
    AccessSettingsUnavailableException failure = new AccessSettingsUnavailableException();
    when(maintenance.currentMaintenance())
        .thenReturn(new MaintenanceSettings(3, false, "Pause", null))
        .thenThrow(failure);
    boolean earlierAdmission = admission.allowsHandoff();

    // When
    ThrowingCallable nextDecision = admission::allowsHandoff;

    // Then
    assertThat(earlierAdmission).isTrue();
    assertThatThrownBy(nextDecision).isSameAs(failure);
  }
}
