package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Admission;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.StartCycle;
import com.blockout.backend.collection.application.model.CollectionWorkMapper;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.time.Clock;
import java.util.HashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Short admission transactions freeze authorized work; no provider request runs under these locks.
 */
@Service
@RequiredArgsConstructor
public class AdmitCollectionCycle {
  private final CollectionStore store;
  private final CollectionWorkMapper mapper;
  private final CollectorRuntimeAccess runtimeAccess;
  private final ChangeCollectionSeasons seasons;
  private final FreezeCollectionTargets selection;
  private final Clock clock;

  /**
   * Commits RUNNING before returning a context; duplicate identity cannot widen its admitted
   * purpose.
   *
   * @param command exactly one control or candidate and the revision read before admission
   * @return newly created or identical retained context
   * @throws CollectionConflictException for stale configuration, lifecycle or competing work
   */
  @Transactional
  public Admission admit(StartCycle command) {
    if ((command.controlId() == null) == (command.sourceBindingId() == null))
      throw CollectionConflictException.invalidContext();
    runtimeAccess.requireCurrent(command.incarnationId());
    Optional<Cycle> existing = store.cycle(command.cycleId());
    if (existing.isPresent()) {
      Cycle cycle = existing.orElseThrow();
      if (!Objects.equals(cycle.controlId(), command.controlId())
          || !Objects.equals(cycle.sourceBindingId(), command.sourceBindingId())
          || !cycle.incarnationId().equals(command.incarnationId())
          || cycle.revision() != command.revision()
          || !Objects.equals(cycle.requestId(), command.requestId()))
        throw CollectionConflictException.invalidContext();
      return new Admission(cycle, false);
    }
    return command.controlId() == null ? admitValidation(command) : admitControl(command);
  }

  /**
   * Admits one exact pending validation.
   *
   * @param command current pending validation
   * @return one admitted exact candidate, without collection mode or sporting targets
   */
  private Admission admitValidation(StartCycle command) {
    if (command.requestId() != null) throw CollectionConflictException.invalidContext();
    CollectionSeasonView season =
        seasons.lockCollectionState(store.sourceSeason(command.sourceBindingId()));
    Source source = store.lockSource(command.sourceBindingId());
    CollectionRevision.requireRevision(command.revision(), source.revision());
    if (season.collectionState() == CollectionSeasonStateEnum.CLOSED
        || source.locked()
        || source.validationState() != SourceValidationStateEnum.PENDING
        || source.candidateUrl() == null
        || source.currentCycleId() != null) throw CollectionConflictException.invalidContext();
    Cycle cycle =
        store.createCycle(command, null, mapper.toCandidate(source, season), clock.instant());
    store.startValidation(source, cycle);
    return new Admission(cycle, true);
  }

  /**
   * Consumes pending intent while freezing its authorized scope.
   *
   * @param command control admission after its runtime has been fenced
   * @return immutable backend-selected scope; pending intent is consumed atomically
   */
  private Admission admitControl(StartCycle command) {
    UUID seasonId = store.controlSeason(command.controlId());
    CollectionSeasonView season = seasonId == null ? null : seasons.lockCollectionState(seasonId);
    Control control = store.lockControl(command.controlId());
    CollectionRevision.requireRevision(command.revision(), control.revision());
    if (!Objects.equals(command.requestId(), control.requestId()))
      throw CollectionConflictException.invalidContext();
    CollectionModeEnum mode =
        control.requestId() == null ? CollectionModeEnum.PERIODIC : control.requestedMode();
    if (mode == null
        || isRunning(control.currentCycleId())
        || (season != null && season.collectionState() == CollectionSeasonStateEnum.CLOSED)
        || (mode != CollectionModeEnum.INITIAL_IMPORT
            && (!control.enabled()
                || (season != null
                    && season.collectionState() != CollectionSeasonStateEnum.ACTIVE)))
        || (mode == CollectionModeEnum.INITIAL_IMPORT
            && (season == null || control.sourceBindingIds().isEmpty())))
      throw CollectionConflictException.invalidContext();
    CollectionRevision.requireAdvance(control.revision());
    Cycle cycle = store.createCycle(command, mode, null, clock.instant());
    selection.freeze(cycle, control, season);
    if (mode == CollectionModeEnum.INITIAL_IMPORT && !control.scopeIds().isEmpty()) {
      Set<UUID> selected = new HashSet<>();
      for (int page = 0; ; page++) {
        com.blockout.backend.collection.application.model.CollectionState.SnapshotPage targets =
            store.targets(cycle.id(), page, 200);
        targets.items().forEach(target -> selected.add(target.scopeId()));
        if (!targets.hasNext()) break;
      }
      if (!selected.containsAll(control.scopeIds()))
        throw CollectionConflictException.invalidContext();
    }
    store.startControl(control, cycle);
    store.discardCycle(control.currentCycleId());
    return new Admission(cycle, true);
  }

  /**
   * Checks whether the retained cycle still owns current work.
   *
   * @param id previous current cycle, or null
   * @return whether its retained state is still running
   */
  private boolean isRunning(UUID id) {
    return id != null
        && store
            .cycle(id)
            .map(cycle -> cycle.state() == CollectionCycleStateEnum.RUNNING)
            .orElse(false);
  }
}
