package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;

/**
 * Current-state JPA adapter; all locks and mutations remain in the application-owned transaction.
 */
@Repository
@RequiredArgsConstructor
class JpaCollectionStore implements CollectionStore {
  private final EntityManager entityManager;
  private final CollectorRuntimeRepository runtimes;
  private final CollectionControlRepository controls;
  private final SourceBindingRepository sources;
  private final CollectionCycleRepository cycles;
  private final CollectionTargetRepository targets;
  private final CollectionPersistenceMapper mapper;
  private final CollectionResultRepository results;

  /** {@inheritDoc} */
  @Override
  public boolean containsTarget(UUID cycleId, UUID scopeId, CollectionTargetKindEnum kind) {
    return targets.existsByCycleIdAndScopeIdAndKind(cycleId, scopeId, kind);
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Cycle lockCycleForUpdate(UUID id) {
    return mapper.toView(
        cycles.lockForUpdate(id).orElseThrow(CollectionNotFoundException::new),
        runtime().incarnationId());
  }

  /** {@inheritDoc} */
  @Override
  public Optional<CollectionResult> result(
      UUID controlId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase) {
    return results
        .findById(new CollectionResultEntity.Key(controlId, scopeId, stage, phase))
        .map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public void saveResult(UUID controlId, CollectionResult result) {
    results.saveAndFlush(mapper.toEntity(controlId, result));
    if (result.phase() == CollectionPhaseEnum.ACQUISITION)
      controls.recordAttempt(controlId, result.observedAt());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.ResultPage results(UUID controlId, int page, int size) {
    Slice<CollectionResultEntity> slice =
        results.findByControlIdOrderByScopeIdAscStageAscPhaseAsc(
            controlId, PageRequest.of(page, size));
    return new CollectionState.ResultPage(
        slice.stream().map(mapper::toView).toList(), page, slice.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public void complete(CollectionState.Cycle cycle, Instant completedAt) {
    cycles.findById(cycle.id()).orElseThrow().setCompletedAt(completedAt);
    if (cycle.controlId() != null && results.successful(cycle.id(), cycle.cycleOrder()))
      controls.recordSuccess(cycle.controlId(), completedAt);
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Source lockAcceptedSource(CollectionState.Source source) {
    return saveSource(source.toBuilder().locked(true).acceptedUrl(source.candidateUrl()).build());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Source createSource(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      String candidateUrl) {
    return mapper.toView(
        sources.saveAndFlush(
            new SourceBindingEntity(seasonId, provider, organizerReference, candidateUrl)));
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Source saveSource(CollectionState.Source source) {
    SourceBindingEntity entity = sources.findById(source.id()).orElseThrow();
    // Renewing interrupted pending intent only changes the version-excluded cycle pointer.
    if (entity.getValidationState() == SourceValidationStateEnum.PENDING
        && source.validationState() == SourceValidationStateEnum.PENDING
        && !Objects.equals(entity.getCurrentCycleId(), source.currentCycleId()))
      entityManager.lock(entity, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    mapper.update(source, entity);
    sources.flush();
    return mapper.toView(entity);
  }

  /** {@inheritDoc} */
  @Override
  public void ensureSeasonControl(UUID seasonId, CollectionProviderEnum provider) {
    CollectionFamilyEnum family =
        switch (provider) {
          case FFVB -> CollectionFamilyEnum.FFVB;
          case LNV -> CollectionFamilyEnum.LNV;
        };
    if (!controls.existsBySeasonIdAndFamily(seasonId, family))
      controls.save(new CollectionControlEntity(seasonId, family));
  }

  /** {@inheritDoc} */
  @Override
  public List<CollectionAttempt> attempts(UUID controlId, List<UUID> scopeIds) {
    return scopeIds.isEmpty() ? List.of() : results.attempts(controlId, scopeIds);
  }

  /** {@inheritDoc} */
  @Override
  public UUID controlSeason(UUID id) {
    return controls.seasonScope(id).orElseThrow(CollectionNotFoundException::new).seasonId();
  }

  /** {@inheritDoc} */
  @Override
  public UUID sourceSeason(UUID id) {
    return sources.seasonScope(id).orElseThrow(CollectionNotFoundException::new).seasonId();
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.CycleScope cycleScope(UUID id) {
    return cycles.scope(id).orElseThrow(CollectionNotFoundException::new);
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Cycle lockCycle(UUID id) {
    return mapper.toView(
        cycles.lockById(id).orElseThrow(CollectionNotFoundException::new),
        runtime().incarnationId());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Runtime runtime() {
    return mapper.toView(runtimes.findById(1).orElseThrow());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Runtime lockRuntime() {
    return mapper.toView(runtimes.lockCurrent());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Runtime lockRuntimeForReplacement() {
    return mapper.toView(runtimes.lockForReplacement());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Runtime replaceRuntime(UUID incarnationId) {
    CollectorRuntimeEntity runtime = runtimes.findById(1).orElseThrow();
    runtime.setIncarnationId(incarnationId);
    runtimes.flush();
    return mapper.toView(runtime);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<CollectionState.Control> control(UUID id) {
    return controls.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Control lockControl(UUID id) {
    return mapper.toView(controls.lockById(id).orElseThrow(CollectionNotFoundException::new));
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Control setControlIntent(
      UUID id, boolean enabled, UUID requestId, CollectionModeEnum mode) {
    CollectionControlEntity entity =
        controls.findById(id).orElseThrow(CollectionNotFoundException::new);
    entity.setEnabled(enabled);
    entity.setRequestId(requestId);
    entity.setRequestedMode(mode);
    if (requestId == null) {
      entity.getSourceBindingIds().clear();
      entity.getScopeIds().clear();
    }
    controls.flush();
    return mapper.toView(entity);
  }

  /** {@inheritDoc} */
  @Override
  public List<CollectionState.Control> controls() {
    return controls.findAllByOrderById().stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public List<CollectionState.Control> controls(UUID seasonId) {
    return controls.findBySeasonIdOrderById(seasonId).stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public Optional<CollectionState.Source> source(UUID id) {
    return sources.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Source lockSource(UUID id) {
    return mapper.toView(sources.lockById(id).orElseThrow(CollectionNotFoundException::new));
  }

  /** {@inheritDoc} */
  @Override
  public List<CollectionState.Source> sources(UUID seasonId) {
    return sources.findBySeasonIdOrderByProviderAscOrganizerReferenceAscIdAsc(seasonId).stream()
        .map(mapper::toView)
        .toList();
  }

  /** {@inheritDoc} */
  @Override
  public List<CollectionState.Source> pendingValidations() {
    return sources.pendingValidations().stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public Optional<CollectionState.Cycle> cycle(UUID id) {
    UUID current = runtime().incarnationId();
    return cycles.findById(id).map(cycle -> mapper.toView(cycle, current));
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Cycle createCycle(
      CollectionState.StartCycle command,
      CollectionModeEnum mode,
      CollectionState.Candidate candidate,
      Instant now) {
    CollectionCycleEntity cycle = new CollectionCycleEntity(command, mode, candidate, now);
    try {
      cycles.saveAndFlush(cycle);
    } catch (DataIntegrityViolationException exception) {
      throw new CollectionConflictException("invalid-cycle-context");
    }
    return mapper.toView(cycle, command.incarnationId());
  }

  /** {@inheritDoc} */
  @Override
  public void startControl(CollectionState.Control control, CollectionState.Cycle cycle) {
    CollectionControlEntity entity = controls.findById(control.id()).orElseThrow();
    entity.setCurrentCycleId(cycle.id());
    entity.setLastStartedAt(cycle.startedAt());
    entity.setRequestId(null);
    entity.setRequestedMode(null);
    entity.getSourceBindingIds().clear();
    entity.getScopeIds().clear();
  }

  /** {@inheritDoc} */
  @Override
  public void startValidation(CollectionState.Source source, CollectionState.Cycle cycle) {
    sources.findById(source.id()).orElseThrow().setCurrentCycleId(cycle.id());
  }

  /** {@inheritDoc} */
  @Override
  public void discardCycle(UUID id) {
    if (id != null) cycles.deleteById(id);
  }

  /** {@inheritDoc} */
  @Override
  public void addTargets(UUID cycleId, List<CollectionState.Target> values) {
    targets.saveAll(
        values.stream()
            .map(
                value -> {
                  CollectionTargetEntity row = mapper.toEntity(value);
                  row.setCycleId(cycleId);
                  return row;
                })
            .toList());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.SnapshotPage targets(UUID cycleId, int page, int size) {
    Slice<CollectionTargetEntity> slice =
        targets.findByCycleIdOrderByKindAscScopeIdAsc(cycleId, PageRequest.of(page, size));
    return new CollectionState.SnapshotPage(
        slice.getContent().stream().map(mapper::toView).toList(), slice.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public Optional<CollectionState.Target> target(
      UUID cycleId, UUID scopeId, CollectionTargetKindEnum kind) {
    return targets
        .findById(new CollectionTargetEntity.Key(cycleId, scopeId, kind))
        .map(mapper::toView);
  }
}
