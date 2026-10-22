package com.blockout.backend.access.domain;

/**
 * Reports missing or invalid persisted settings without manufacturing permissive initial values.
 */
public class AccessSettingsUnavailableException extends RuntimeException {
  /** Reports a missing fixed settings row without manufacturing defaults. */
  public AccessSettingsUnavailableException() {}

  /**
   * Preserves a validation cause internally without exposing its values at the HTTP/log boundary.
   *
   * @param cause invalid persisted state, which may contain private diagnostic details
   */
  public AccessSettingsUnavailableException(Throwable cause) {
    super(cause);
  }
}
