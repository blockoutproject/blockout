package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.MaintenanceSettings;

/**
 * Settings persistence; writes participate in the caller's transaction with native JPA versions.
 */
public interface AccessSettingsStore {
  /** Returns complete stored maintenance, failing unavailable for a missing or invalid row. */
  MaintenanceSettings maintenance();

  /** Returns complete stored versions, failing unavailable for a missing or invalid row. */
  ApplicationVersionSettings versions();

  /**
   * Applies changed content/activation and returns the accepted state.
   *
   * @param settings complete validated result
   * @return accepted group
   */
  MaintenanceSettings saveMaintenance(MaintenanceSettings settings);

  /**
   * Applies the complete valid versions result and returns the accepted group.
   *
   * @param settings complete validated result
   * @return accepted versions group
   */
  ApplicationVersionSettings saveVersions(ApplicationVersionSettings settings);

  /**
   * Reads both fixed rows with one SQL statement snapshot; missing/invalid data stays unavailable.
   */
  ReadAccessConfiguration.Snapshot readComplete();
}
