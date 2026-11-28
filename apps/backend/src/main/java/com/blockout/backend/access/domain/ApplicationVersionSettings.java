package com.blockout.backend.access.domain;

/** Current platform settings and their optional shared update message. */
public record ApplicationVersionSettings(Platform ios, Platform android, String message) {
  /**
   * Validates both resulting platforms and trims supplied optional text.
   *
   * @param ios complete Apple settings
   * @param android complete Google Play settings
   * @param message optional shared plain text; null uses standard mobile copy
   * @throws IllegalArgumentException for an invalid complete group
   */
  public ApplicationVersionSettings {
    AccessSettingsValidation.platform(ios, true);
    AccessSettingsValidation.platform(android, false);
    message = AccessSettingsValidation.text(message, false);
  }

  /** Nullable minimum and destination; the enclosing group applies platform-specific invariants. */
  public record Platform(String minimumVersion, String storeUrl) {}
}
