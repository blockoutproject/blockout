package com.blockout.backend.jobs.application;

import java.util.Objects;

/** Separates successful effects from expected owner rejection without exception-based branching. */
public sealed interface JobResult {
  /** External effects have finished; the worker still needs to acknowledge this live lease. */
  record Completed() implements JobResult {}

  /**
   * Defers local SQL effects to the worker's fenced acknowledgement transaction. The callback uses
   * the job datasource, performs SQL only, and must respect its transaction timeout. It is never
   * executed for an already expired or replaced lease.
   */
  record SqlEffect(Runnable effect) implements JobResult {
    public SqlEffect {
      Objects.requireNonNull(effect);
    }
  }

  /** Owner validation permanently rejects work using a stable code, without logging its payload. */
  record Rejected(String code) implements JobResult {
    public Rejected {
      if (code == null || !code.matches("[A-Z][A-Z0-9_]{0,99}"))
        throw new IllegalArgumentException("Invalid safe error code");
    }
  }
}
