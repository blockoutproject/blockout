package com.blockout.backend.access.domain;

/** Both platform settings and the optional update message share one independent revision. */
public record ApplicationVersionSettings(
    long revision, Platform ios, Platform android, String message) {
  /**
   * Validates both resulting platforms and trims supplied optional text.
   *
   * @param revision shared versions revision, independent of maintenance
   * @param ios complete Apple settings
   * @param android complete Google Play settings
   * @param message optional shared plain text; null uses standard mobile copy
   * @throws IllegalArgumentException for an invalid complete group
   */
  public ApplicationVersionSettings {
    AccessSettingsValidation.revision(revision);
    AccessSettingsValidation.platform(ios, true);
    AccessSettingsValidation.platform(android, false);
    message = AccessSettingsValidation.text(message, false);
  }

  /** Nullable minimum and destination; the enclosing group applies platform-specific invariants. */
  public record Platform(String minimumVersion, String storeUrl) {}
}
