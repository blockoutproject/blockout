package com.blockout.backend.accounts.application.exception;

/**
 * A concurrent principal creation whose winner can be read only after the rejected insert rolls
 * back.
 */
public class AccountCreationConflictException extends RuntimeException {
  /**
   * Retains the failed insert internally without exposing database diagnostics in its message.
   *
   * @param cause immediate principal uniqueness refusal
   */
  public AccountCreationConflictException(Throwable cause) {
    super(null, cause);
  }
}
