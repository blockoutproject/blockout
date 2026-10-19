package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import java.time.Instant;
import java.util.List;
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
  private final CollectorRuntimeRepository runtimes;
  private final CollectionControlRepository controls;
  private final SourceBindingRepository sources;
  private final CollectionCycleRepository cycles;
  private final CollectionTargetRepository targets;
  private final CollectionPersistenceMapper mapper;
  private final CollectionResultRepository results;

  /** {@inheritDoc} */
  @Override
  public void lockAcceptedSource(CollectionState.Source source) {
    sources.findById(source.id()).orElseThrow().setLocked(true);
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
  public List<CollectionState.Control> controls() {
    return controls.findAllByOrderById().stream().map(mapper::toView).toList();
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
    return sources.findBySeasonIdOrderById(seasonId).stream().map(mapper::toView).toList();
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
  public boolean containsTarget(UUID cycleId, UUID scopeId) {
    return targets.existsByCycleIdAndScopeId(cycleId, scopeId);
  }
}
