package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.MaintenanceSettings;

/** Settings persistence; writes and optimistic locks participate in the caller's transaction. */
public interface AccessSettingsStore {
  /** Returns complete stored maintenance, failing unavailable for a missing or invalid row. */
  MaintenanceSettings maintenance();

  /** Returns complete stored versions, failing unavailable for a missing or invalid row. */
  ApplicationVersionSettings versions();

  /** Reads maintenance with a JPA optimistic check retained through commit, including no-ops. */
  MaintenanceSettings maintenanceForChange();

  /** Reads versions with the same commit-time optimistic check for both platform editors. */
  ApplicationVersionSettings versionsForChange();

  /**
   * Applies changed content/activation and flushes to return the actual JPA-managed revision.
   *
   * @param settings complete validated result, retaining the previously checked revision
   * @return flushed group with the managed version
   */
  MaintenanceSettings saveMaintenance(MaintenanceSettings settings);

  /**
   * Applies the complete valid versions result and returns the flushed JPA-managed revision.
   *
   * @param settings complete validated result, retaining the previously checked revision
   * @return flushed versions group
   */
  ApplicationVersionSettings saveVersions(ApplicationVersionSettings settings);

  /**
   * Reads both fixed rows with one SQL statement snapshot; missing/invalid data stays unavailable.
   */
  ReadAccessConfiguration.Snapshot readComplete();
}
