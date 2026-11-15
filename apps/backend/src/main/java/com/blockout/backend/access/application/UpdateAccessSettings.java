package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.InvalidAccessSettingsException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Atomic commands: current grants precede settings effects and JPA owns concurrent commit checks.
 */
@Service
@RequiredArgsConstructor
public class UpdateAccessSettings {
  private final AccessSettingsStore store;
  private final ActionAuthorization authorization;

  /** Content-only intent; omitted text and undefined image retain stored values. */
  public record MaintenanceChange(String message, JsonNullable<String> imageUrl) {}

  /** Distinguishes omitted optional platform fields from explicit null removal. */
  public record PlatformChange(
      JsonNullable<String> minimumVersion, JsonNullable<String> storeUrl) {}

  /** Supplied platform fields and shared message retain independent omission semantics. */
  public record VersionChange(
      PlatformChange ios, PlatformChange android, JsonNullable<String> message) {}

  /**
   * Saves valid supplied content against the current state without changing activation.
   *
   * @param account original account UUID resolved before the transaction
   * @param change supplied content and field presence
   * @return complete accepted maintenance state
   * @throws InvalidAccessSettingsException for an invalid resulting group
   */
  @Transactional
  public MaintenanceSettings changeMaintenance(UUID account, MaintenanceChange change) {
    authorization.require(account, Permission.MANAGE_MAINTENANCE);
    MaintenanceSettings current = store.maintenanceForChange();
    MaintenanceSettings result;
    try {
      result =
          new MaintenanceSettings(
              current.active(),
              change.message() == null ? current.message() : change.message(),
              change.imageUrl().orElse(current.imageUrl()));
    } catch (IllegalArgumentException invalid) {
      throw new InvalidAccessSettingsException();
    }
    return save(current, result);
  }

  /**
   * Sets a desired state explicitly while preserving the current stored content.
   *
   * @param account original account UUID
   * @param active desired global state
   * @return complete maintenance state after the accepted command
   */
  @Transactional
  public MaintenanceSettings activate(UUID account, boolean active) {
    authorization.require(account, Permission.MANAGE_MAINTENANCE);
    MaintenanceSettings current = store.maintenanceForChange();
    return save(current, new MaintenanceSettings(active, current.message(), current.imageUrl()));
  }

  /**
   * Validates and saves both resulting platforms atomically, leaving maintenance untouched.
   *
   * @param account original account UUID
   * @param change supplied platforms and shared message
   * @return the complete accepted versions group
   * @throws InvalidAccessSettingsException for an invalid resulting group
   */
  @Transactional
  public ApplicationVersionSettings changeVersions(UUID account, VersionChange change) {
    authorization.require(account, Permission.MANAGE_APPLICATION_VERSIONS);
    ApplicationVersionSettings current = store.versionsForChange();
    ApplicationVersionSettings result;
    try {
      result =
          new ApplicationVersionSettings(
              platform(current.ios(), change.ios()),
              platform(current.android(), change.android()),
              change.message().orElse(current.message()));
    } catch (IllegalArgumentException invalid) {
      throw new InvalidAccessSettingsException();
    }
    if (current.equals(result)) {
      return current;
    }
    return store.saveVersions(result);
  }

  /**
   * Applies content/activation only when it changes the complete valid maintenance value.
   *
   * @param current validated current group
   * @param result complete validated desired value
   * @return unchanged state for a no-op, otherwise the accepted state
   */
  private MaintenanceSettings save(MaintenanceSettings current, MaintenanceSettings result) {
    if (current.equals(result)) {
      return current;
    }
    return store.saveMaintenance(result);
  }

  /**
   * Computes one resulting platform while preserving undefined values and honoring explicit null.
   *
   * @param current complete stored platform
   * @param change optional supplied fields; null leaves the platform unchanged
   * @return complete resulting platform for whole-group validation
   */
  private static ApplicationVersionSettings.Platform platform(
      ApplicationVersionSettings.Platform current, PlatformChange change) {
    return change == null
        ? current
        : new ApplicationVersionSettings.Platform(
            change.minimumVersion().orElse(current.minimumVersion()),
            change.storeUrl().orElse(current.storeUrl()));
  }
}
