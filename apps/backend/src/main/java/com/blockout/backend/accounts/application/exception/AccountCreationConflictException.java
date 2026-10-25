package com.blockout.backend.accounts.application.exception;

/** A competing principal or username creation that can be reconsidered only after rollback. */
public class AccountCreationConflictException extends RuntimeException {
  /**
   * Retains the failed insert internally without exposing database diagnostics in its message.
   *
   * @param cause immediate account uniqueness refusal
   */
  public AccountCreationConflictException(Throwable cause) {
    super(null, cause);
  }
}
