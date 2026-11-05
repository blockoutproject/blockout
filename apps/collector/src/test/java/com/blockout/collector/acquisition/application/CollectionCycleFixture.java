package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import java.time.Instant;

/** Pure backend cycle responses shared by collector lifecycle and orchestration tests. */
final class CollectionCycleFixture {
  /** Prevents instantiation of the shared cycle data factory. */
  private CollectionCycleFixture() {}

  /**
   * Correlates a running periodic control response to the lifecycle's admission request.
   *
   * @param command explicit control admission whose identities remain unchanged
   * @return running control response with cycle order 1 without a candidate or completion time
   */
  static CollectionBackend.Cycle runningControl(CollectionBackend.StartCycle command) {
    return new CollectionBackend.Cycle(
        command.cycleId(),
        command.incarnationId(),
        command.controlId(),
        command.sourceBindingId(),
        1,
        CollectionModeEnum.PERIODIC,
        CollectionCycleStateEnum.RUNNING,
        null,
        null);
  }

  /**
   * Correlates a running validation response with the scenario's exact candidate.
   *
   * @param command explicit candidate admission whose identities remain unchanged
   * @param candidate scenario-owned source configuration frozen by admission
   * @return running candidate response with cycle order 1 without a control mode or completion time
   */
  static CollectionBackend.Cycle runningCandidate(
      CollectionBackend.StartCycle command, CollectionBackend.Candidate candidate) {
    return new CollectionBackend.Cycle(
        command.cycleId(),
        command.incarnationId(),
        command.controlId(),
        command.sourceBindingId(),
        1,
        null,
        CollectionCycleStateEnum.RUNNING,
        candidate,
        null);
  }

  /**
   * Retains the accepted context while supplying its exact terminal timestamp.
   *
   * @param cycle original admitted response whose identities, order, mode and candidate are
   *     retained
   * @param completedAt scenario-owned accepted completion time
   * @return the original context in the completed state at the supplied instant
   */
  static CollectionBackend.Cycle completed(CollectionBackend.Cycle cycle, Instant completedAt) {
    return new CollectionBackend.Cycle(
        cycle.id(),
        cycle.incarnationId(),
        cycle.controlId(),
        cycle.sourceBindingId(),
        cycle.cycleOrder(),
        cycle.mode(),
        CollectionCycleStateEnum.COMPLETED,
        cycle.candidate(),
        completedAt);
  }
}
