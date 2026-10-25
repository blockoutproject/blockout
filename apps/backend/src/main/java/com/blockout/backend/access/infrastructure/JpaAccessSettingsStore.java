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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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
  @Transactional(propagation = Propagation.MANDATORY)
  public MaintenanceSettings maintenanceForChange() {
    return maintenance(row("maintenance", true));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public ApplicationVersionSettings versionsForChange() {
    return versions(row("versions", true));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public MaintenanceSettings saveMaintenance(MaintenanceSettings settings) {
    AccessSettingsEntity entity = row("maintenance", false);
    entity.maintenance(settings);
    rows.flush();
    return maintenance(entity);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
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
    return new Snapshot(
        maintenance(
            value.maintenanceRevision(),
            value.active(),
            value.maintenanceMessage(),
            value.imageUrl()),
        versions(
            value.versionsRevision(),
            value.iosMinimumVersion(),
            value.iosStoreUrl(),
            value.androidMinimumVersion(),
            value.androidStoreUrl(),
            value.updateMessage()));
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
    return (forChange ? rows.findByIdForUpdate(id) : rows.findById(id))
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
    return maintenance(
        entity.getRevision(), entity.getActive(), entity.getMessage(), entity.getImageUrl());
  }

  /**
   * Validates the same stored maintenance facts from entity and complete snapshot reads.
   *
   * @param revision current group revision
   * @param active required stored activation state
   * @param message optional prepared message
   * @param imageUrl optional prepared image
   * @return complete valid maintenance state
   * @throws AccessSettingsUnavailableException for invalid persisted state
   */
  private static MaintenanceSettings maintenance(
      long revision, Boolean active, String message, String imageUrl) {
    try {
      if (active == null) throw new IllegalArgumentException("Missing active state");
      return new MaintenanceSettings(revision, active, message, imageUrl);
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
    return versions(
        entity.getRevision(),
        entity.getIosMinimumVersion(),
        entity.getIosStoreUrl(),
        entity.getAndroidMinimumVersion(),
        entity.getAndroidStoreUrl(),
        entity.getMessage());
  }

  /**
   * Validates both platform settings consistently for entity and complete snapshot reads.
   *
   * @param revision current shared versions revision
   * @param iosMinimumVersion optional stored iOS minimum
   * @param iosStoreUrl optional stored iOS destination
   * @param androidMinimumVersion optional stored Android minimum
   * @param androidStoreUrl optional stored Android destination
   * @param message optional shared update message
   * @return complete valid versions state
   * @throws AccessSettingsUnavailableException for invalid persisted state
   */
  private static ApplicationVersionSettings versions(
      long revision,
      String iosMinimumVersion,
      String iosStoreUrl,
      String androidMinimumVersion,
      String androidStoreUrl,
      String message) {
    try {
      return new ApplicationVersionSettings(
          revision,
          new Platform(iosMinimumVersion, iosStoreUrl),
          new Platform(androidMinimumVersion, androidStoreUrl),
          message);
    } catch (IllegalArgumentException invalid) {
      throw new AccessSettingsUnavailableException(invalid);
    }
  }
}
