package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** Backend admission boundary; only it can authorize provider work, never a remembered fallback. */
public interface CollectionBackend {
  /** Current read-only intent; polling never admits work or refreshes a remembered fallback. */
  record Work(List<ControlWork> controls, List<ValidationWork> validations) {
    /**
     * Detaches the complete current configuration lists.
     *
     * @param controls current independent scheduling contexts
     * @param validations candidates awaiting admission
     */
    public Work {
      controls = List.copyOf(controls);
      validations = List.copyOf(validations);
    }
  }

  /** Backend-owned eligibility and single pending request for one independent scope. */
  record ControlWork(
      UUID id,
      CollectionFamilyEnum family,
      UUID seasonId,
      long revision,
      boolean enabled,
      CollectionSeasonStateEnum seasonState,
      UUID requestId,
      CollectionModeEnum requestedMode,
      UUID runningCycleId) {}

  /** One current candidate awaiting admission; admission freezes its provider configuration. */
  record ValidationWork(UUID sourceBindingId, long revision) {}

  /**
   * Reads current intent for this startup; a refused read authorizes no provider call.
   *
   * @param incarnationId startup confirmed once by registration
   * @return current backend-selected control and validation work
   */
  Work work(UUID incarnationId);

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
   * Admitted capability retaining the frozen validation candidate; control targets are read by
   * page.
   */
  record Cycle(
      UUID id,
      UUID incarnationId,
      UUID controlId,
      UUID sourceBindingId,
      long cycleOrder,
      CollectionModeEnum mode,
      CollectionCycleStateEnum state,
      Candidate candidate,
      Instant completedAt) {}

  /**
   * Acquisition inputs from the backend-selected target. Classification and scheduling evidence
   * stay with backend admission; absent provider fields are never guessed by the passage.
   */
  @Builder(toBuilder = true)
  record Target(
      UUID scopeId,
      CollectionTargetKindEnum kind,
      UUID sourceBindingId,
      URI url,
      String seasonLabel,
      String competitionReference,
      String poolReference,
      String tourReference,
      String groupReference,
      UUID poolId,
      UUID matchId,
      UUID clubId,
      String clubReference,
      CollectionProviderEnum provider,
      String organizerReference,
      String nativeMatchReference,
      String localityRevision,
      String municipality,
      String postalCode,
      String nativeTeamReference) {}

  /** Bounded snapshot page, without a persistent checkpoint or total count. */
  record TargetPage(List<Target> items, long page, boolean hasNext) {
    /**
     * Detaches the admitted selection.
     *
     * @param items current page of admitted targets
     * @param page zero-based snapshot page
     * @param hasNext whether another snapshot page exists
     */
    public TargetPage {
      items = List.copyOf(items);
    }
  }

  /** Independent actual evidence; null counts mean unmeasured. */
  record Result(
      UUID scopeId,
      CollectionStageEnum stage,
      CollectionPhaseEnum phase,
      long readOrdinal,
      Instant observedAt,
      CollectionOutcomeEnum outcome,
      URI reasonType,
      String reason,
      Long obtainedCount,
      Long rejectedCount) {}

  /** Qualified entry proposal; it never authorizes launch, classification or replacement. */
  record SourceProposal(
      UUID incarnationId,
      long startYear,
      CollectionProviderEnum provider,
      String organizerReference,
      URI candidateUrl,
      URI evidenceUrl,
      Instant observedAt) {}

  /**
   * Proposes a qualified source through the canonical generated operation exactly once.
   *
   * @param proposal actual entry evidence and current incarnation
   */
  void observeSource(SourceProposal proposal);

  /** Exact candidate frozen at admission, without authorizing sporting writes. */
  record Candidate(
      URI candidateUrl,
      String seasonLabel,
      CollectionProviderEnum provider,
      String organizerReference) {}

  /**
   * Terminal candidate evidence; interpretation and backend application remain source-preparation
   * responsibilities. A null reasonType retains an unknown failure category.
   */
  record Validation(
      UUID cycleId,
      SourceValidationStateEnum state,
      Instant observedAt,
      String seasonEvidence,
      String reason,
      URI reasonType) {}

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

  /**
   * Reads one bounded page of the immutable admitted selection.
   *
   * @param cycleId admitted control
   * @param page stable zero-based page
   * @return one bounded selected batch
   */
  TargetPage targets(UUID cycleId, long page);

  /**
   * Records one independent phase without changing sporting data.
   *
   * @param cycleId admitted control
   * @param result attributable evidence
   * @return current running context
   */
  Cycle record(UUID cycleId, Result result);

  /**
   * Ends selected control work without asserting global success.
   *
   * @param cycleId admitted control
   * @param completedAt actual selected-work end
   * @return accepted terminal context
   */
  Cycle complete(UUID cycleId, Instant completedAt);

  /**
   * Submits candidate evidence once through its separate terminal operation.
   *
   * @param sourceBindingId admitted candidate owner
   * @param result exact terminal evidence, attempted only once
   */
  void validate(UUID sourceBindingId, Validation result);
}
