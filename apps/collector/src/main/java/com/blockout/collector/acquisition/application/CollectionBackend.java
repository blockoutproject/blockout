package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import java.util.UUID;

/** Backend admission boundary; only it can authorize provider work, never a remembered fallback. */
public interface CollectionBackend {
  /** Current registration, including explicit absence before the first process starts. */
  record Runtime(long revision, UUID incarnationId) {}

  /**
   * One admission identity is allocated before the request and retained through uncertain
   * responses.
   */
  record StartCycle(
      UUID cycleId,
      UUID incarnationId,
      UUID controlId,
      UUID sourceBindingId,
      long revision,
      UUID requestId) {}

  /**
   * Minimal admitted capability; provider-specific configuration is read through its cycle targets.
   */
  record Cycle(
      UUID id,
      UUID incarnationId,
      UUID controlId,
      UUID sourceBindingId,
      long cycleOrder,
      CollectionModeEnum mode,
      CollectionCycleStateEnum state,
      boolean hasCandidate) {}

  /**
   * Reads current registration without claiming it.
   *
   * @return current registration without any write
   */
  Runtime current();

  /**
   * Attempts the startup registration once.
   *
   * @param revision revision read at this startup
   * @param incarnationId UUID allocated once
   * @return accepted registration; never automatically replay the mutation
   */
  Runtime register(long revision, UUID incarnationId);

  /**
   * Attempts one identified admission without replay.
   *
   * @param command single identified admission
   * @return committed context, or a classified failure without automatic mutation retry
   */
  Cycle admit(StartCycle command);

  /**
   * Confirms the original cycle after an uncertain response.
   *
   * @param id original admission UUID
   * @return current retained cycle after uncertainty; no new admission is created
   */
  Cycle cycle(UUID id);
}
