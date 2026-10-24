package com.blockout.backend.sporting.application.exception;

/** Safe whole-command rejection of cross-field or actual-content invariants. */
public class SportingValidationException extends RuntimeException {
  /** Creates a rejection carrying no submitted or private values. */
  public SportingValidationException() {
    super("Invalid sporting change");
  }
}
