package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.collector.generated.ingestion.model.SportFormatEnum;
import com.blockout.collector.generated.ingestion.model.SportGenderEnum;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

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
      boolean hasCandidate,
      Instant completedAt) {}

  /** Exact backend-selected context; absent provider fields are never guessed by the passage. */
  @Builder(toBuilder = true)
  record Target(
      UUID scopeId,
      CollectionTargetKindEnum kind,
      UUID sourceBindingId,
      URI url,
      String seasonLabel,
      String competitionReference,
      String packReference,
      String poolReference,
      String tourReference,
      String groupReference,
      UUID poolId,
      UUID matchId,
      UUID clubId,
      String clubReference,
      UUID divisionId,
      SportFormatEnum format,
      SportGenderEnum gender,
      Instant lastAttemptAt,
      Instant lastSuccessAt,
      Instant fastWindowEndsAt,
      CollectionProviderEnum provider,
      String organizerReference,
      String nativeMatchReference,
      String localityRevision,
      String municipality,
      String postalCode) {}

  /** Bounded snapshot page, without a persistent checkpoint or total count. */
  record TargetPage(List<Target> items, long page, boolean hasNext) {
    /** Detaches the admitted selection. */
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

  /** Exact admitted candidate context, independently reread without authorizing sporting writes. */
  record Candidate(
      URI candidateUrl,
      String seasonLabel,
      CollectionProviderEnum provider,
      String organizerReference) {}

  /**
   * Reads the original candidate from its admitted cycle.
   *
   * @param cycleId confirmed validation cycle
   * @return exact frozen candidate, never a newly edited source
   */
  Candidate candidate(UUID cycleId);

  /**
   * Terminal candidate evidence; interpretation and backend application remain source-preparation
   * responsibilities.
   */
  record Validation(
      UUID cycleId,
      SourceValidationStateEnum state,
      Instant observedAt,
      String seasonEvidence,
      String reason) {}

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
