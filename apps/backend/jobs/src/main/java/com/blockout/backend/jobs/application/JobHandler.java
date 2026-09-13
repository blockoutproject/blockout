package com.blockout.backend.jobs.application;

/** Owner adapter for one fixed versioned job type, registered once in the worker assembly. */
public interface JobHandler {
  /**
   * Identifies the single durable job type owned by this handler.
   *
   * @return the stable publication type, matching the publisher naming contract
   */
  String type();

  /**
   * Selects the payload version understood by this handler.
   *
   * @return the positive version paired with the registered type
   */
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
   *
   * @param job claimed payload and fenced attempt identity
   * @return the effect or permanent rejection for worker-owned acknowledgement
   * @throws InterruptedException execution is cancelled; the lease remains recoverable
   */
  JobResult handle(Job job) throws InterruptedException;
}
