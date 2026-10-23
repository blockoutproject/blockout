package com.blockout.backend.access.domain;

/** Stored content and desired activation share only the maintenance revision. */
public record MaintenanceSettings(long revision, boolean active, String message, String imageUrl) {
  /**
   * Constructs a complete valid group, normalizing text once and fetching no media.
   *
   * @param revision independent maintenance revision, within the JavaScript-safe range
   * @param active desired global state; content-only changes preserve it
   * @param message required usable plain text
   * @param imageUrl optional controlled public HTTPS asset
   * @throws IllegalArgumentException for an invalid complete group
   */
  public MaintenanceSettings {
    AccessSettingsValidation.revision(revision);
    message = AccessSettingsValidation.text(message, true);
    AccessSettingsValidation.image(imageUrl);
  }
}
