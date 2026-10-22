package com.blockout.backend.access.infrastructure;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ReadAccessConfiguration.Snapshot;
import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.ApplicationVersionSettings.Platform;
import com.blockout.backend.access.domain.MaintenanceSettings;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** Maps only valid current database state; initialization is exclusively migration-owned. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class JpaAccessSettingsStore implements AccessSettingsStore {
  private final AccessSettingsRepository rows;

  /** {@inheritDoc} */
  @Override
  public MaintenanceSettings maintenance() {
    return maintenance(row("maintenance", false));
  }

  /** {@inheritDoc} */
  @Override
  public ApplicationVersionSettings versions() {
    return versions(row("versions", false));
  }

  /** {@inheritDoc} */
  @Override
  public MaintenanceSettings maintenanceForChange() {
    return maintenance(row("maintenance", true));
  }

  /** {@inheritDoc} */
  @Override
  public ApplicationVersionSettings versionsForChange() {
    return versions(row("versions", true));
  }

  /** {@inheritDoc} */
  @Override
  public MaintenanceSettings saveMaintenance(MaintenanceSettings settings) {
    AccessSettingsEntity entity = row("maintenance", false);
    entity.maintenance(settings);
    rows.flush();
    return maintenance(entity);
  }

  /** {@inheritDoc} */
  @Override
  public ApplicationVersionSettings saveVersions(ApplicationVersionSettings settings) {
    AccessSettingsEntity entity = row("versions", false);
    entity.versions(settings);
    rows.flush();
    return versions(entity);
  }

  /** {@inheritDoc} */
  @Override
  public Snapshot readComplete() {
    AccessSettingsRows value = rows.complete().orElseThrow(AccessSettingsUnavailableException::new);
    try {
      if (value.active() == null) throw new IllegalArgumentException("Missing active state");
      return new Snapshot(
          new MaintenanceSettings(
              value.maintenanceRevision(),
              value.active(),
              value.maintenanceMessage(),
              value.imageUrl()),
          new ApplicationVersionSettings(
              value.versionsRevision(),
              new Platform(value.iosMinimumVersion(), value.iosStoreUrl()),
              new Platform(value.androidMinimumVersion(), value.androidStoreUrl()),
              value.updateMessage()));
    } catch (IllegalArgumentException invalid) {
      throw new AccessSettingsUnavailableException(invalid);
    }
  }

  /**
   * Resolves a required fixed row, optionally retaining native optimistic checking until commit.
   *
   * @param id fixed settings group identity
   * @param forChange whether the transaction must retain optimistic checking
   * @return the current managed settings row
   * @throws AccessSettingsUnavailableException if the required row is missing
   */
  private AccessSettingsEntity row(String id, boolean forChange) {
    return (forChange ? rows.forChange(id) : rows.findById(id))
        .orElseThrow(AccessSettingsUnavailableException::new);
  }

  /**
   * Validates persisted maintenance rather than manufacturing inactive defaults.
   *
   * @param entity current managed maintenance row
   * @return valid immutable stored maintenance
   * @throws AccessSettingsUnavailableException for invalid persisted state
   */
  private static MaintenanceSettings maintenance(AccessSettingsEntity entity) {
    try {
      if (entity.getActive() == null) throw new IllegalArgumentException("Missing active state");
      return new MaintenanceSettings(
          entity.getRevision(), entity.getActive(), entity.getMessage(), entity.getImageUrl());
    } catch (IllegalArgumentException invalid) {
      throw new AccessSettingsUnavailableException(invalid);
    }
  }

  /**
   * Validates both stored platforms and their optional shared message as a whole.
   *
   * @param entity current managed versions row
   * @return complete valid immutable versions group
   * @throws AccessSettingsUnavailableException for invalid persisted state
   */
  private static ApplicationVersionSettings versions(AccessSettingsEntity entity) {
    try {
      return new ApplicationVersionSettings(
          entity.getRevision(),
          new Platform(entity.getIosMinimumVersion(), entity.getIosStoreUrl()),
          new Platform(entity.getAndroidMinimumVersion(), entity.getAndroidStoreUrl()),
          entity.getMessage());
    } catch (IllegalArgumentException invalid) {
      throw new AccessSettingsUnavailableException(invalid);
    }
  }
}
