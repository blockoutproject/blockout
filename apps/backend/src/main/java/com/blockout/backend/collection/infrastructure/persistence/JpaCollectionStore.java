package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.shared.pagination.PageOffset;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Current-state JPA adapter; locks and mutations require the application-owned transaction.
 * Repositories cannot silently start an isolated write or release a lock before the use case
 * commits.
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
  private final InitialCoverageRepository coverage;
  private final InitialCoveragePersistenceMapper coverageMapper;

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Control ensureSeasonControl(
      UUID seasonId, CollectionProviderEnum provider, boolean enabledOnCreate) {
    CollectionFamilyEnum family =
        switch (provider) {
          case FFVB -> CollectionFamilyEnum.FFVB;
          case LNV -> CollectionFamilyEnum.LNV;
        };
    CollectionControlEntity entity =
        controls
            .findBySeasonIdAndFamily(seasonId, family)
            .orElseGet(
                () ->
                    controls.saveAndFlush(
                        new CollectionControlEntity(seasonId, family, enabledOnCreate)));
    return mapper.toView(entity);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Control setInitialIntent(
      UUID id, UUID requestId, Set<UUID> sourceIds, Set<UUID> scopeIds) {
    CollectionControlEntity entity =
        controls.findById(id).orElseThrow(CollectionNotFoundException::new);
    entity.setRequestId(requestId);
    entity.setRequestedMode(CollectionModeEnum.INITIAL_IMPORT);
    entity.getSourceBindingIds().clear();
    entity.getSourceBindingIds().addAll(sourceIds);
    entity.getScopeIds().clear();
    entity.getScopeIds().addAll(scopeIds);
    controls.flush();
    return mapper.toView(entity);
  }

  /** {@inheritDoc} */
  @Override
  public InitialCoverage.Page initialCoverage(UUID seasonId, int page, int size) {
    Slice<InitialCoverageEntity> slice = coverage.coverage(seasonId, PageRequest.of(page, size));
    return new InitialCoverage.Page(
        slice.stream().map(coverageMapper::toView).toList(), page, slice.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public List<InitialCoverage> initialCoverage(Set<UUID> sourceIds, Set<UUID> scopeIds) {
    return coverage.findBySourceBindingIdInAndScopeIdIn(sourceIds, scopeIds).stream()
        .map(coverageMapper::toView)
        .toList();
  }

  /** {@inheritDoc} */
  @Override
  public Optional<InitialCoverage> initialCoverage(
      UUID sourceId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase) {
    return coverage
        .findById(new InitialCoverageEntity.Key(sourceId, scopeId, stage, phase))
        .map(coverageMapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void saveInitialCoverage(InitialCoverage value) {
    InitialCoverageEntity entity =
        coverage
            .findById(
                new InitialCoverageEntity.Key(
                    value.sourceBindingId(), value.scopeId(), value.stage(), value.phase()))
            .orElse(null);
    if (entity == null) {
      entityManager.persist(coverageMapper.toEntity(value));
    } else {
      coverageMapper.update(value, entity);
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void finishInitialCoverage(UUID cycleId) {
    coverage.finishRequested(
        cycleId, InitialCoverage.Status.REQUESTED, InitialCoverage.Status.UNAVAILABLE);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<CollectionState.Target> firstTarget(
      UUID cycleId, List<UUID> scopeIds, CollectionTargetKindEnum kind) {
    return scopeIds.isEmpty()
        ? Optional.empty()
        : targets
            .findFirstByCycleIdAndScopeIdInAndKindOrderByScopeIdAsc(
                cycleId, scopeIds, mapper.persistedKind(kind))
            .map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Cycle lockCycleForUpdate(UUID id) {
    return mapper.toView(
        cycles.findByIdForUpdate(id).orElseThrow(CollectionNotFoundException::new),
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
  @Transactional(propagation = Propagation.MANDATORY)
  public void saveResult(UUID controlId, CollectionResult result) {
    CollectionResultEntity.Key key =
        new CollectionResultEntity.Key(controlId, result.scopeId(), result.stage(), result.phase());
    CollectionResultEntity entity = results.findById(key).orElse(null);
    if (entity == null) {
      entityManager.persist(mapper.toEntity(controlId, result));
    } else {
      mapper.update(result, entity);
    }
    if (result.phase() == CollectionPhaseEnum.ACQUISITION) {
      controls.recordAttempt(controlId, result.observedAt());
    }
  }

  /** {@inheritDoc} */
  @Override
  public List<CollectionResult> catalogResults(UUID seasonId, List<UUID> sourceIds) {
    return sourceIds.isEmpty()
        ? List.of()
        : results.catalogResults(seasonId, sourceIds).stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.ResultPage results(
      UUID controlId, CollectionState.ResultFilters filters, long page, int size) {
    CollectionState.ResultSummary summary =
        results.summary(controlId).orElseThrow(CollectionNotFoundException::new);
    if (page > PageOffset.maxPage(size)) {
      return new CollectionState.ResultPage(List.of(), page, false, summary);
    }
    Slice<CollectionResultRepository.CurrentResult> slice =
        results.currentResults(
            controlId,
            filters.query(),
            filters.status() == null ? null : filters.status().name(),
            filters.sourceId(),
            filters.stage() == null ? null : filters.stage().name(),
            PageRequest.of((int) page, size));
    return new CollectionState.ResultPage(
        slice.stream().map(this::resultRow).toList(), page, slice.hasNext(), summary);
  }

  /** Keeps a catalogue link absent when the result has no established source binding. */
  private CollectionState.ResultRow resultRow(CollectionResultRepository.CurrentResult row) {
    CollectionResult result = mapper.toView(row);
    if (row.getSourceId() == null) {
      return new CollectionState.ResultRow(result, row.getScopeLabel(), null);
    }
    CollectionState.ResultSource source =
        new CollectionState.ResultSource(
            row.getSourceId(),
            CollectionState.Source.label(row.getSourceProvider(), row.getOrganizerReference()),
            row.getPackId(),
            row.getPoolId(),
            row.getPhaseReference());
    String scopeLabel =
        result.stage() == CollectionStageEnum.DISCOVERY ? source.label() : row.getScopeLabel();
    return new CollectionState.ResultRow(result, scopeLabel, source);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void complete(CollectionState.Cycle cycle, Instant completedAt) {
    cycles.findById(cycle.id()).orElseThrow().setCompletedAt(completedAt);
    if (cycle.controlId() != null
        && results.successful(cycle.controlId(), cycle.id(), cycle.cycleOrder())) {
      controls.recordSuccess(cycle.controlId(), completedAt);
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Source lockAcceptedSource(CollectionState.Source source) {
    return saveSource(source.toBuilder().locked(true).acceptedUrl(source.candidateUrl()).build());
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Source createSource(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      String candidateUrl) {
    return mapper.toView(
        sources.save(
            new SourceBindingEntity(seasonId, provider, organizerReference, candidateUrl)));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Source saveSource(CollectionState.Source source) {
    SourceBindingEntity entity = sources.findById(source.id()).orElseThrow();
    // Renewing interrupted pending intent only changes the version-excluded cycle pointer.
    if (entity.getValidationState() == SourceValidationStateEnum.PENDING
        && source.validationState() == SourceValidationStateEnum.PENDING
        && !Objects.equals(entity.getCurrentCycleId(), source.currentCycleId())) {
      entityManager.lock(entity, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    }
    mapper.update(source, entity);
    // Expose the native collector revision in the returned immutable view.
    sources.flush();
    return mapper.toView(entity);
  }

  /** {@inheritDoc} */
  @Override
  public boolean hasOrdinarySources(UUID seasonId, CollectionProviderEnum provider) {
    return !sources.ordinarySources(seasonId, provider, Limit.of(1)).isEmpty();
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
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Cycle lockCycle(UUID id) {
    return mapper.toView(
        cycles.findByIdForShare(id).orElseThrow(CollectionNotFoundException::new),
        runtime().incarnationId());
  }

  /** {@inheritDoc} */
  @Override
  public CollectionState.Runtime runtime() {
    return mapper.toView(runtimes.findById(1).orElseThrow());
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Runtime lockRuntime() {
    return mapper.toView(runtimes.findCurrentForShare());
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Runtime lockRuntimeForReplacement() {
    return mapper.toView(runtimes.findCurrentForUpdate());
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Runtime replaceRuntime(UUID incarnationId) {
    CollectorRuntimeEntity runtime = runtimes.findById(1).orElseThrow();
    runtime.setIncarnationId(incarnationId);
    // The registration response carries the new native collector revision.
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
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Control lockControl(UUID id) {
    return mapper.toView(
        controls.findByIdForUpdate(id).orElseThrow(CollectionNotFoundException::new));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
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
    // Return the revision of this accepted intent, including collection changes.
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
  public Optional<CollectionState.Source> source(
      UUID seasonId, CollectionProviderEnum provider, String organizerReference) {
    return sources
        .findBySeasonIdAndProviderAndOrganizerReference(seasonId, provider, organizerReference)
        .map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Source lockSource(UUID id) {
    return mapper.toView(
        sources.findByIdForUpdate(id).orElseThrow(CollectionNotFoundException::new));
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
  public List<CollectionState.Source> ordinarySources(
      UUID seasonId, CollectionProviderEnum provider) {
    return sources.ordinarySources(seasonId, provider, Limit.unlimited()).stream()
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
  public Map<UUID, CollectionState.Cycle> cycles(List<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    UUID current = runtime().incarnationId();
    return cycles.findByIdIn(ids).stream()
        .collect(
            Collectors.toUnmodifiableMap(
                CollectionCycleEntity::getId, cycle -> mapper.toView(cycle, current)));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Cycle createCycle(
      CollectionState.StartCycle command,
      CollectionModeEnum mode,
      CollectionState.Candidate candidate,
      Instant now) {
    CollectionCycleEntity cycle = new CollectionCycleEntity(command, mode, candidate, now);
    try {
      // Resolve unique context conflicts here while the entire admission can still roll back.
      cycles.saveAndFlush(cycle);
    } catch (DataIntegrityViolationException exception) {
      throw new CollectionConflictException("invalid-cycle-context");
    }
    return mapper.toView(cycle, command.incarnationId());
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
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
  @Transactional(propagation = Propagation.MANDATORY)
  public void startValidation(CollectionState.Source source, CollectionState.Cycle cycle) {
    sources.findById(source.id()).orElseThrow().setCurrentCycleId(cycle.id());
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void discardCycle(UUID id) {
    if (id != null) {
      cycles.deleteById(id);
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void addTargets(UUID cycleId, List<CollectionState.Target> values) {
    for (CollectionState.Target value : values) {
      CollectionTargetEntity row = mapper.toEntity(value);
      row.setCycleId(cycleId);
      // Admission creates new snapshot keys; merge would read each assigned key unnecessarily.
      entityManager.persist(row);
    }
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
        .findById(new CollectionTargetEntity.Key(cycleId, scopeId, mapper.persistedKind(kind)))
        .map(mapper::toView);
  }
}
