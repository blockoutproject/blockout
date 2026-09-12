package com.blockout.backend.logging;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Retains exception types and execution locations without messages that may contain provider data,
 * credentials or SQL rows. Both executables use this boundary before handing failures to SLF4J;
 * formatting alone would leave private messages visible to other appenders.
 */
public final class SafeDiagnostics {
  private SafeDiagnostics() {}

  /** A bounded throwable snapshot; the original failure is never mutated or logged. */
  public static Throwable snapshot(Throwable failure) {
    return snapshot(failure, new AtomicInteger(16));
  }

  // Bound the complete graph, including cyclic causes and suppressed exceptions.
  private static Throwable snapshot(Throwable failure, AtomicInteger remaining) {
    if (failure == null || remaining.getAndDecrement() <= 0) return null;
    var safe = new Throwable(failure.getClass().getName(), snapshot(failure.getCause(), remaining));
    safe.setStackTrace(
        Arrays.copyOf(failure.getStackTrace(), Math.min(100, failure.getStackTrace().length)));
    for (Throwable suppressed : Arrays.stream(failure.getSuppressed()).limit(4).toList()) {
      Throwable child = snapshot(suppressed, remaining);
      if (child != null) safe.addSuppressed(child);
    }
    return safe;
  }
}
