package com.blockout.backend.accounts.application.exception;

/**
 * Required account evidence or admission is temporarily unavailable; no provider diagnostics
 * escape.
 */
public class AccountUnavailableException extends RuntimeException {
  /** Represents unavailable evidence or admission without additional diagnostics. */
  public AccountUnavailableException() {}

  /**
   * Retains the internal technical cause without including its message in the public refusal.
   *
   * @param cause provider failure, never serialized or rendered in logs by this boundary
   */
  public AccountUnavailableException(Throwable cause) {
    super(null, cause);
  }
}
