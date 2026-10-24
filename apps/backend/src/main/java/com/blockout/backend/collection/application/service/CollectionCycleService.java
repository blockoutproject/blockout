package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Admission;
import com.blockout.backend.collection.application.model.CollectionState.Candidate;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlWork;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.CycleScope;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.SnapshotPage;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.StartCycle;
import com.blockout.backend.collection.application.model.CollectionState.TargetPage;
import com.blockout.backend.collection.application.model.CollectionState.Work;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.SeasonService;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Short admission transactions freeze authorized work; no provider request runs under these locks.
 */
@Service
@RequiredArgsConstructor
public class CollectionCycleService {
  private final CollectionStore store;
  private final CollectorRuntimeService runtimes;
  private final SeasonService seasons;
  private final CollectionTargetSelector selection;
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
      throw invalidContext();
    runtimes.requireCurrent(command.incarnationId());
    Optional<Cycle> existing = store.cycle(command.cycleId());
    if (existing.isPresent()) {
      Cycle cycle = existing.orElseThrow();
      if (!Objects.equals(cycle.controlId(), command.controlId())
          || !Objects.equals(cycle.sourceBindingId(), command.sourceBindingId())
          || !cycle.incarnationId().equals(command.incarnationId())
          || cycle.revision() != command.revision()
          || !Objects.equals(cycle.requestId(), command.requestId())) throw invalidContext();
      return new Admission(cycle, false);
    }
    return command.controlId() == null ? admitValidation(command) : admitControl(command);
  }

  /**
   * Reads retained state without admitting work.
   *
   * @param id retained cycle identity
   * @return current state, including interrupted old work; this read admits nothing
   */
  @Transactional(readOnly = true)
  public Cycle get(UUID id) {
    return store.cycle(id).orElseThrow(CollectionNotFoundException::new);
  }

  /**
   * Supplies a runtime-first, transaction-held capability to sporting/result owners.
   *
   * @param id admitted cycle; caller must invoke this before taking domain/account locks
   * @return running control context; validation contexts cannot authorize sporting writes
   * @throws CollectionConflictException for completed, superseded or candidate-only context
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Cycle requireRunningControl(UUID id) {
    Cycle cycle = requireRunning(id);
    if (cycle.controlId() == null) throw invalidContext();
    return cycle;
  }

  /**
   * Locks a control passage for result recording or idempotent completion.
   *
   * @param id retained control context
   * @return exclusively locked current cycle, possibly already completed
   * @throws CollectionConflictException for candidate or superseded context
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Cycle lockControlPassage(UUID id) {
    CycleScope scope = store.cycleScope(id);
    runtimes.requireCurrent(scope.incarnationId());
    if (scope.controlId() == null) throw invalidContext();
    UUID seasonId = store.controlSeason(scope.controlId());
    if (seasonId != null) seasons.lockCollectionState(seasonId);
    return store.lockCycleForUpdate(id);
  }

  /**
   * Projects current scheduling intent without consuming it.
   *
   * @param incarnationId registered current process
   * @return read-only current intent; obsolete validations are never requeued
   */
  @Transactional
  public Work work(UUID incarnationId) {
    runtimes.requireCurrent(incarnationId);
    List<Control> configuration = store.controls();
    List<Source> pending =
        store.pendingValidations().stream().filter(source -> !source.locked()).toList();
    Map<UUID, Cycle> contexts =
        store.cycles(
            configuration.stream()
                .map(Control::currentCycleId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
    Set<UUID> seasonIds = new HashSet<>();
    for (Control control : configuration) {
      if (control.seasonId() != null) seasonIds.add(control.seasonId());
    }
    for (Source source : pending) seasonIds.add(source.seasonId());
    Map<UUID, CollectionSeasonView> seasonStates = seasons.collectionStates(seasonIds);
    List<ControlWork> controls = new ArrayList<>();
    for (Control control : configuration) {
      CollectionSeasonStateEnum state =
          control.seasonId() == null
              ? null
              : seasonStates.get(control.seasonId()).collectionState();
      Cycle context =
          control.currentCycleId() == null ? null : contexts.get(control.currentCycleId());
      UUID running =
          context != null && context.state() == CollectionCycleStateEnum.RUNNING
              ? context.id()
              : null;
      controls.add(
          new ControlWork(
              control.id(),
              control.family(),
              control.seasonId(),
              control.revision(),
              control.enabled(),
              state,
              control.requestId(),
              control.requestedMode(),
              running,
              control.lastStartedAt()));
    }
    List<Candidate> candidates =
        pending.stream()
            .filter(
                source ->
                    seasonStates.get(source.seasonId()).collectionState()
                        != CollectionSeasonStateEnum.CLOSED)
            .map(source -> candidate(source, seasonStates.get(source.seasonId())))
            .toList();
    return new Work(controls, candidates);
  }

  /**
   * Serves one bounded page of authorized targets.
   *
   * @param cycleId running current control
   * @param page zero-based page validated against the generated contract's safe range
   * @param size page size validated against the generated contract's 1–200 bound
   * @return frozen configuration with current permitted locality; no provider observation occurs
   */
  @Transactional
  public TargetPage targets(UUID cycleId, long page, int size) {
    requireRunningControl(cycleId);
    if (page > Integer.MAX_VALUE / size) return new TargetPage(List.of(), page, false);
    SnapshotPage snapshot = store.targets(cycleId, (int) page, size);
    List<ServedTarget> targets = selection.serve(snapshot.items());
    return new TargetPage(targets, page, snapshot.hasNext());
  }

  /**
   * Admits one exact pending validation.
   *
   * @param command current pending validation
   * @return one admitted exact candidate, without collection mode or sporting targets
   */
  private Admission admitValidation(StartCycle command) {
    if (command.requestId() != null) throw invalidContext();
    CollectionSeasonView season =
        seasons.lockCollectionState(store.sourceSeason(command.sourceBindingId()));
    Source source = store.lockSource(command.sourceBindingId());
    requireRevision(command.revision(), source.revision());
    if (season.collectionState() == CollectionSeasonStateEnum.CLOSED
        || source.locked()
        || source.validationState() != SourceValidationStateEnum.PENDING
        || source.candidateUrl() == null
        || source.currentCycleId() != null) throw invalidContext();
    Cycle cycle = store.createCycle(command, null, candidate(source, season), clock.instant());
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
    requireRevision(command.revision(), control.revision());
    if (!Objects.equals(command.requestId(), control.requestId())) throw invalidContext();
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
            && (season == null || control.sourceBindingIds().isEmpty()))) throw invalidContext();
    CollectorRuntimeService.requireAdvance(control.revision());
    Cycle cycle = store.createCycle(command, mode, null, clock.instant());
    selection.freeze(cycle, control, season);
    store.startControl(control, cycle);
    store.discardCycle(control.currentCycleId());
    return new Admission(cycle, true);
  }

  /**
   * Acquires the running capability in runtime-first lock order.
   *
   * @param id retained context
   * @return running context under runtime, season and shared cycle locks, in that order
   */
  private Cycle requireRunning(UUID id) {
    CycleScope scope = store.cycleScope(id);
    runtimes.requireCurrent(scope.incarnationId());
    UUID seasonId =
        scope.controlId() == null
            ? store.sourceSeason(scope.sourceBindingId())
            : store.controlSeason(scope.controlId());
    if (seasonId != null) seasons.lockCollectionState(seasonId);
    Cycle cycle = store.lockCycle(id);
    if (cycle.state() != CollectionCycleStateEnum.RUNNING) throw invalidContext();
    return cycle;
  }

  /**
   * Checks whether the retained cycle still owns current work.
   *
   * @param id previous current cycle, or null
   * @return whether it is still running in the current incarnation
   */
  private boolean isRunning(UUID id) {
    return id != null
        && store
            .cycle(id)
            .map(cycle -> cycle.state() == CollectionCycleStateEnum.RUNNING)
            .orElse(false);
  }

  /**
   * Freezes the exact source and expected season.
   *
   * @param source current unchanged candidate
   * @param season canonical expected season
   * @return exact validation-only snapshot
   */
  private Candidate candidate(Source source, CollectionSeasonView season) {
    return new Candidate(
        source.id(),
        source.revision(),
        source.candidateUrl(),
        season.label(),
        source.provider(),
        source.organizerReference());
  }

  /**
   * Rejects stale mutation state without effects.
   *
   * @param expected supplied editing revision
   * @param actual current aggregate revision
   */
  private void requireRevision(long expected, long actual) {
    if (expected != actual) throw new CollectionConflictException("stale-revision");
  }

  /**
   * Creates the canonical safe context refusal.
   *
   * @return the canonical safe refusal, independent of provider URLs or personal values
   */
  private CollectionConflictException invalidContext() {
    return new CollectionConflictException("invalid-cycle-context");
  }

  /**
   * Authorizes one exact sporting role while retaining runtime, season and cycle locks through
   * commit.
   *
   * @param id current control cycle
   * @param scopeId addressed source or pool identity
   * @param kind required acquisition role
   * @return frozen admitted target
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Target requireTarget(
      UUID id, UUID scopeId, CollectionTargetKindEnum kind) {
    requireRunningControl(id);
    return store.target(id, scopeId, kind).orElseThrow(this::invalidContext);
  }

  /**
   * Resolves an admitted catalog's canonical source after its runtime and season are fenced.
   *
   * @param id current control cycle
   * @param sourceId exact source-season binding
   * @return current source identity; caller retains the transaction fence
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Source requireCatalogSource(UUID id, UUID sourceId) {
    requireTarget(id, sourceId, CollectionTargetKindEnum.DISCOVERY);
    return store.source(sourceId).orElseThrow(this::invalidContext);
  }

  /**
   * Authorizes an existing match through its exact detail role or its admitted parent calendar.
   *
   * @param id current cycle
   * @param matchId known match identity resolved by the sporting owner
   * @param poolId immutable owning pool resolved by the sporting owner
   * @return frozen detail or parent calendar context, never caller-supplied parent authority
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Target requireDetail(UUID id, UUID matchId, UUID poolId) {
    requireRunningControl(id);
    return store
        .target(id, matchId, CollectionTargetKindEnum.DETAILS)
        .or(() -> store.target(id, poolId, CollectionTargetKindEnum.CALENDAR))
        .orElseThrow(this::invalidContext);
  }

  /**
   * Authorizes source artwork only through an existing admitted calendar membership. The sporting
   * owner supplies retained pool identities; this method acquires the runtime/season/cycle fence
   * before any sporting root or account lock, and holds it through the caller's commit.
   *
   * @param id current cycle
   * @param poolIds memberships read by the sporting owner, never supplied by the HTTP caller
   * @return exact admitted calendar capability
   * @throws CollectionConflictException when none of these memberships is admitted
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public CollectionState.Target requireTeamLogo(UUID id, List<UUID> poolIds) {
    requireRunningControl(id);
    return poolIds.stream()
        .map(poolId -> store.target(id, poolId, CollectionTargetKindEnum.CALENDAR))
        .flatMap(Optional::stream)
        .findFirst()
        .orElseThrow(this::invalidContext);
  }
}
