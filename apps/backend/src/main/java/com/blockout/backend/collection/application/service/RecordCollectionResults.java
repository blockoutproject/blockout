package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionStageMapper;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    if (cycle.state() != CollectionCycleStateEnum.RUNNING
        || !contains(cycleId, command.scopeId(), command.stage()))
      throw CollectionConflictException.invalidContext();
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
    store.complete(cycle, completedAt);
    return store.cycle(cycleId).orElseThrow();
  }

  /**
   * Resolves child identities through their sporting owner, never by accepting a caller's parent.
   *
   * @param cycleId current snapshot
   * @param scopeId stable source or sporting identity
   * @param stage exact acquisition role
   * @return whether the role is directly admitted or resolves through an admitted calendar
   */
  private boolean contains(UUID cycleId, UUID scopeId, CollectionStageEnum stage) {
    if (stage == CollectionStageEnum.LOGO) {
      return store.containsAnyTarget(
          cycleId, acquisitionReads.teamPools(scopeId), CollectionTargetKindEnum.CALENDAR);
    }
    if (store.containsTarget(cycleId, scopeId, stages.toTargetKind(stage))) return true;
    return stage == CollectionStageEnum.DETAILS
        && acquisitionReads
            .matchPoolId(scopeId)
            .map(pool -> store.containsTarget(cycleId, pool, CollectionTargetKindEnum.CALENDAR))
            .orElse(false);
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
