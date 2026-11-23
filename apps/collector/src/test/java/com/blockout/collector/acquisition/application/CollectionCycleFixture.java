package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;

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
        null);
  }

  /**
   * Correlates a running validation response with the scenario's exact candidate.
   *
   * @param command explicit candidate admission whose identities remain unchanged
   * @param candidate scenario-owned source configuration frozen by admission
   * @return running candidate response with cycle order 1 and no control mode
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
        candidate);
  }
}
