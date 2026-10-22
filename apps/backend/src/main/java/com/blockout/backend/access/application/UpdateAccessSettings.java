package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.AccessSettingsValidation;
import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.InvalidAccessSettingsException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.access.domain.StaleSettingsRevisionException;
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
  public record MaintenanceChange(long revision, String message, JsonNullable<String> imageUrl) {}

  /** Distinguishes omitted optional platform fields from explicit null removal. */
  public record PlatformChange(
      JsonNullable<String> minimumVersion, JsonNullable<String> storeUrl) {}

  /** One expected revision covers both platforms and their shared message. */
  public record VersionChange(
      long revision, PlatformChange ios, PlatformChange android, JsonNullable<String> message) {}

  /**
   * Saves valid content without changing activation; stale no-ops remain conflicts.
   *
   * @param account original account UUID resolved before the transaction
   * @param change submitted revision and content presence
   * @return complete accepted maintenance state, including the managed revision
   * @throws StaleSettingsRevisionException for an obsolete editing revision
   * @throws InvalidAccessSettingsException for an invalid result or revision overflow
   */
  @Transactional
  public MaintenanceSettings changeMaintenance(UUID account, MaintenanceChange change) {
    authorization.require(account, Permission.MANAGE_MAINTENANCE);
    MaintenanceSettings current = store.maintenanceForChange();
    expected(change.revision(), current.revision());
    MaintenanceSettings result;
    try {
      result =
          new MaintenanceSettings(
              current.revision(),
              current.active(),
              change.message() == null ? current.message() : change.message(),
              change.imageUrl().orElse(current.imageUrl()));
    } catch (IllegalArgumentException invalid) {
      throw new InvalidAccessSettingsException();
    }
    return save(current, result);
  }

  /**
   * Sets a desired state explicitly, preserving the stored content and matching no-op revision.
   *
   * @param account original account UUID
   * @param revision expected maintenance revision, including for no-ops
   * @param active desired global state
   * @return complete maintenance state after the accepted command
   * @throws StaleSettingsRevisionException for an obsolete revision
   * @throws InvalidAccessSettingsException when the managed revision cannot advance safely
   */
  @Transactional
  public MaintenanceSettings activate(UUID account, long revision, boolean active) {
    authorization.require(account, Permission.MANAGE_MAINTENANCE);
    MaintenanceSettings current = store.maintenanceForChange();
    expected(revision, current.revision());
    return save(
        current,
        new MaintenanceSettings(current.revision(), active, current.message(), current.imageUrl()));
  }

  /**
   * Validates and saves both resulting platforms atomically, leaving maintenance untouched.
   *
   * @param account original account UUID
   * @param change expected common revision, supplied platforms and shared message
   * @return the complete accepted versions group
   * @throws StaleSettingsRevisionException for an obsolete revision on either platform
   * @throws InvalidAccessSettingsException for an invalid result or revision overflow
   */
  @Transactional
  public ApplicationVersionSettings changeVersions(UUID account, VersionChange change) {
    authorization.require(account, Permission.MANAGE_APPLICATION_VERSIONS);
    ApplicationVersionSettings current = store.versionsForChange();
    expected(change.revision(), current.revision());
    ApplicationVersionSettings result;
    try {
      result =
          new ApplicationVersionSettings(
              current.revision(),
              platform(current.ios(), change.ios()),
              platform(current.android(), change.android()),
              change.message().orElse(current.message()));
    } catch (IllegalArgumentException invalid) {
      throw new InvalidAccessSettingsException();
    }
    if (current.equals(result)) return current;
    canAdvance(current.revision());
    return store.saveVersions(result);
  }

  /**
   * Applies content/activation only when it changes the complete valid maintenance value.
   *
   * @param current validated version checked by the caller
   * @param result complete validated desired value at that revision
   * @return unchanged state for a no-op, otherwise the flushed managed state
   */
  private MaintenanceSettings save(MaintenanceSettings current, MaintenanceSettings result) {
    if (current.equals(result)) return current;
    canAdvance(current.revision());
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

  /**
   * Checks wire safety before comparing the submitted revision, including a no-effect command.
   *
   * @param submitted caller editing revision
   * @param current current JPA group revision
   * @throws StaleSettingsRevisionException when revisions differ
   * @throws InvalidAccessSettingsException when the wire integer is unsafe
   */
  private static void expected(long submitted, long current) {
    try {
      AccessSettingsValidation.revision(submitted);
    } catch (IllegalArgumentException invalid) {
      throw new InvalidAccessSettingsException();
    }
    if (submitted != current) throw new StaleSettingsRevisionException();
  }

  /**
   * Rejects an actual state change at the JavaScript-safe version ceiling rather than wrapping.
   *
   * @param revision current validated revision
   * @throws InvalidAccessSettingsException if the next revision would be unsafe
   */
  private static void canAdvance(long revision) {
    if (revision == AccessSettingsValidation.MAX_REVISION)
      throw new InvalidAccessSettingsException();
  }
}
