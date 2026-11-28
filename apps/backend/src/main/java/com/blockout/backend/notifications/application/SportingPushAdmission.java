package com.blockout.backend.notifications.application;

import com.blockout.backend.access.application.MaintenanceAdmission;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Current-maintenance decision for F07 sporting push handoffs, independent of personal bypass. */
@Service
@RequiredArgsConstructor
public class SportingPushAdmission {
  private final MaintenanceAdmission maintenance;

  /**
   * Checks the current maintenance state for one new handoff. The sender must call this immediately
   * before each provider handoff and discard a skipped attempt without replay. Recipient
   * eligibility, inbox creation and purge remain F07 responsibilities outside this decision. An
   * admitted handoff may finish after activation; this check provides no atomic remote stop or
   * recall guarantee.
   *
   * @return whether current maintenance permits this handoff, never a reusable authorization
   * @throws com.blockout.backend.access.domain.AccessSettingsUnavailableException if current
   *     maintenance cannot be established; no handoff is admitted
   */
  public boolean allowsHandoff() {
    return !maintenance.currentMaintenance().active();
  }
}
