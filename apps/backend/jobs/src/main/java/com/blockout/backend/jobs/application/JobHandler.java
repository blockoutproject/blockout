package com.blockout.backend.jobs.application;

/** Owner adapter for one fixed versioned job type, registered once in the worker assembly. */
public interface JobHandler {
  String type();

  int version();

  /**
   * Runs outside the reservation transaction. External effects must be idempotent using the durable
   * job ID, because a crash after the effect but before acknowledgement can repeat delivery. Return
   * SqlEffect for local changes that must commit atomically with success, or Rejected for permanent
   * validation failure. Never acknowledge directly; the worker owns that transition and its
   * metrics.
   *
   * <p>Implementations must cooperate with interruption and bound dependency calls. Cancellation
   * cannot undo external effects. Unexpected exceptions receive bounded retries;
   * InterruptedException preserves interrupt status and leaves the lease recoverable. Payloads and
   * identities must never be logged by the handler.
   */
  JobResult handle(Job job) throws Exception;
}
