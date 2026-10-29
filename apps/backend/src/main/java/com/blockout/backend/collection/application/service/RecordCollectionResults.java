package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionStageMapper;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Independent current results, serialized with completion under the existing runtime fence. */
@Service
@RequiredArgsConstructor
public class RecordCollectionResults {
  private final CollectionStore store;
  private final CollectionCycleAccess cycleAccess;
  private final ReadSportingAcquisition acquisitionReads;
  private final ApplicationEventPublisher events;
  private final CollectionStageMapper stages;

  /**
   * Accepts only newer evidence for this scope/stage/phase without replaying any sporting write.
   *
   * @param cycleId admitted control passage
   * @param command validated operational evidence
   * @return the still-running context; stale evidence is ignored
   * @throws CollectionConflictException if the scope or passage is not authorized
   */
  @Transactional
  public CollectionState.Cycle record(UUID cycleId, RecordCollectionResult command) {
    CollectionState.Cycle cycle = cycleAccess.lockControlPassage(cycleId);
    if (cycle.state() != CollectionCycleStateEnum.RUNNING)
      throw CollectionConflictException.invalidContext();
    Target target = requireTarget(cycleId, command.scopeId(), command.stage());
    store.lockControl(cycle.controlId());
    CollectionResult previous =
        store
            .result(cycle.controlId(), command.scopeId(), command.stage(), command.phase())
            .orElse(null);
    if (previous != null
        && (previous.cycleOrder() > cycle.cycleOrder()
            || (previous.cycleOrder() == cycle.cycleOrder()
                && previous.readOrdinal() >= command.readOrdinal()))) return cycle;
    Instant lastSuccessAt = command.observedAt();
    Instant firstFailureAt = null;
    Instant firstStructuralFailureAt = null;
    if (command.outcome() != CollectionOutcomeEnum.SUCCESS) {
      lastSuccessAt = previous == null ? null : previous.lastSuccessAt();
      firstFailureAt = command.observedAt();
      if (previous != null && previous.firstFailureAt() != null)
        firstFailureAt = previous.firstFailureAt();
      if (previous != null) firstStructuralFailureAt = previous.firstStructuralFailureAt();
      if (firstStructuralFailureAt == null && isStructuralReason(command.reasonType()))
        firstStructuralFailureAt = command.observedAt();
    }
    store.saveResult(
        cycle.controlId(),
        new CollectionResult(
            command.scopeId(),
            command.stage(),
            command.phase(),
            cycle.cycleOrder(),
            command.readOrdinal(),
            command.observedAt(),
            command.outcome(),
            lastSuccessAt,
            firstFailureAt,
            firstStructuralFailureAt,
            command.reasonType(),
            command.reason(),
            command.obtainedCount(),
            command.rejectedCount()));
    if (cycle.mode() == CollectionModeEnum.INITIAL_IMPORT) recordInitial(cycle, target, command);
    if (command.outcome() != CollectionOutcomeEnum.SUCCESS
        || (previous != null && previous.firstFailureAt() != null))
      events.publishEvent(
          new CollectionOperationalDiagnostics.EvidenceChanged(
              cycle.controlId(), command.scopeId(), command.stage(), command.phase()));
    if (command.stage() == CollectionStageEnum.DISCOVERY
        && command.phase() == CollectionPhaseEnum.INTEGRATION
        && (command.outcome() == CollectionOutcomeEnum.SUCCESS
            || command.outcome() == CollectionOutcomeEnum.PARTIAL))
      events.publishEvent(new CollectionOperationalDiagnostics.CatalogObserved(cycle.controlId()));
    return cycle;
  }

  /**
   * Marks selected work finished; only actual complete evidence may advance control success.
   *
   * @param cycleId admitted control passage, never candidate validation
   * @param completedAt actual end, truncated to PostgreSQL microseconds for terminal identity
   * @return accepted terminal context
   * @throws CollectionConflictException for a conflicting completion
   */
  @Transactional
  public CollectionState.Cycle complete(UUID cycleId, Instant completedAt) {
    CollectionState.Cycle cycle = cycleAccess.lockControlPassage(cycleId);
    completedAt = completedAt.truncatedTo(ChronoUnit.MICROS);
    if (cycle.completedAt() != null) {
      if (!cycle.completedAt().equals(completedAt))
        throw CollectionConflictException.invalidContext();
      return cycle;
    }
    if (completedAt.isBefore(cycle.startedAt())) throw CollectionConflictException.invalidContext();
    if (cycle.mode() == CollectionModeEnum.INITIAL_IMPORT) store.finishInitialCoverage(cycle.id());
    store.complete(cycle, completedAt);
    return store.cycle(cycleId).orElseThrow();
  }

  /**
   * Retains initial evidence independently of ordinary operational freshness, using the same
   * admitted target that authorized this result rather than resolving its source a second time.
   *
   * @param cycle already authorized initial passage under its transaction fence
   * @param target exact admitted role or owning calendar resolved before the result write
   * @param command attributable observed result
   */
  private void recordInitial(
      CollectionState.Cycle cycle, Target target, RecordCollectionResult command) {
    for (CollectionPhaseEnum phase : CollectionPhaseEnum.values()) {
      InitialCoverage previous =
          store
              .initialCoverage(target.sourceBindingId(), command.scopeId(), command.stage(), phase)
              .orElse(null);
      if (previous == null || previous.cycleOrder() != cycle.cycleOrder())
        store.saveInitialCoverage(
            new InitialCoverage(
                target.sourceBindingId(),
                command.scopeId(),
                command.stage(),
                phase,
                InitialCoverage.Status.REQUESTED,
                cycle.id(),
                cycle.cycleOrder(),
                0,
                null,
                null));
    }
    InitialCoverage.Status status =
        switch (command.outcome()) {
          case SUCCESS -> InitialCoverage.Status.OBTAINED;
          case PARTIAL -> InitialCoverage.Status.REJECTED;
          case FAILED ->
              isRejectedReason(command.reasonType())
                  ? InitialCoverage.Status.REJECTED
                  : InitialCoverage.Status.UNAVAILABLE;
          case UNCONFIRMED -> InitialCoverage.Status.UNAVAILABLE;
        };
    store.saveInitialCoverage(
        new InitialCoverage(
            target.sourceBindingId(),
            command.scopeId(),
            command.stage(),
            command.phase(),
            status,
            cycle.id(),
            cycle.cycleOrder(),
            command.readOrdinal(),
            command.obtainedCount(),
            command.rejectedCount()));
  }

  /**
   * Resolves the admitted role once for authorization and initial attribution. Child identities
   * come from their sporting owner, never from a caller's parent. Logo membership uses one bounded
   * query over retained pools instead of one query per membership.
   *
   * @param cycleId current snapshot
   * @param scopeId stable source or sporting identity
   * @param stage exact acquisition role
   * @return direct admitted role or its admitted calendar, retaining the original source binding
   * @throws CollectionConflictException when the requested role has no admitted scope
   */
  private Target requireTarget(UUID cycleId, UUID scopeId, CollectionStageEnum stage) {
    return store
        .target(cycleId, scopeId, stages.toTargetKind(stage))
        .or(
            () ->
                switch (stage) {
                  case LOGO ->
                      store.firstTarget(
                          cycleId,
                          acquisitionReads.teamPools(scopeId),
                          CollectionTargetKindEnum.CALENDAR);
                  case DETAILS ->
                      acquisitionReads
                          .matchPoolId(scopeId)
                          .flatMap(
                              pool ->
                                  store.target(cycleId, pool, CollectionTargetKindEnum.CALENDAR));
                  default -> Optional.empty();
                })
        .orElseThrow(CollectionConflictException::invalidContext);
  }

  /**
   * Distinguishes explicit acquisition/content refusals from technical or unclassified failures.
   *
   * @param reasonType original typed acquisition or F02 outcome, never a parsed diagnostic
   * @return whether actual evidence establishes rejected content
   */
  private static boolean isRejectedReason(URI reasonType) {
    return isStructuralReason(reasonType)
        || URI.create("urn:blockout:problem:unprocessable-content").equals(reasonType)
        || URI.create("urn:blockout:problem:stale-observation").equals(reasonType);
  }

  /**
   * Recognizes only the collector's explicit structural/context categories, never free-form text.
   *
   * @param reasonType original machine-readable failure category, or null
   * @return whether this actual failure establishes unresolved structural evidence
   */
  static boolean isStructuralReason(URI reasonType) {
    return URI.create("urn:blockout:acquisition:structure").equals(reasonType)
        || URI.create("urn:blockout:acquisition:context").equals(reasonType);
  }
}
