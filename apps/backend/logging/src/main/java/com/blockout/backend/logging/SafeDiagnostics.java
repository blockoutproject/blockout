package com.blockout.backend.logging;

/** Keeps the failure type and call site without passing private exception messages to appenders. */
public final class SafeDiagnostics {
  private SafeDiagnostics() {}

  /**
   * Causes and suppressed failures are omitted because their messages may contain provider data.
   */
  public static Throwable snapshot(Throwable failure) {
    var safe = new Throwable(failure.getClass().getName());
    safe.setStackTrace(failure.getStackTrace());
    return safe;
  }
}
