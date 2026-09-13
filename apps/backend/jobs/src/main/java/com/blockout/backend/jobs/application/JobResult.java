package com.blockout.backend.jobs.application;

/** Separates successful effects from expected owner rejection without exception-based branching. */
public sealed interface JobResult {
  /** External effects have finished; the worker still needs to acknowledge this live lease. */
  record Completed() implements JobResult {}

  /**
   * Defers local SQL effects to the worker's fenced acknowledgement transaction. The callback uses
   * the job datasource, performs SQL only, and must respect its transaction timeout. It is never
   * executed for an already expired or replaced lease.
   */
  record SqlEffect(Runnable effect) implements JobResult {}

  /** Owner validation permanently rejects work using a stable code, without logging its payload. */
  record Rejected(String code) implements JobResult {}

  /**
   * Expected failure whose SQL diagnostics commit with its fenced queue transition.
   *
   * @param code stable owner code
   * @param retryAfter minimum delay before another attempt
   * @param permanent whether this work requires a new request
   * @param effect SQL-only owner diagnostics
   */
  record Failed(String code, java.time.Duration retryAfter, boolean permanent, Runnable effect)
      implements JobResult {}
}
