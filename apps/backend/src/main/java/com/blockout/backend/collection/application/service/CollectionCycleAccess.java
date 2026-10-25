package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.CycleScope;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Checks exact admitted scopes under runtime, season and cycle locks retained by the caller. */
@Service
@RequiredArgsConstructor
public class CollectionCycleAccess {
  private final CollectionStore store;
  private final CollectorRuntimeAccess runtimeAccess;
  private final ChangeCollectionSeasons seasons;

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
        .orElseThrow(CollectionConflictException::invalidContext);
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
        .orElseThrow(CollectionConflictException::invalidContext);
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
    return store.source(sourceId).orElseThrow(CollectionConflictException::invalidContext);
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
    return store.target(id, scopeId, kind).orElseThrow(CollectionConflictException::invalidContext);
  }

  /**
   * Acquires the running capability in runtime-first lock order.
   *
   * @param id retained context
   * @return running context under runtime, season and shared cycle locks, in that order
   */
  private Cycle requireRunning(UUID id) {
    CycleScope scope = store.cycleScope(id);
    runtimeAccess.requireCurrent(scope.incarnationId());
    UUID seasonId =
        scope.controlId() == null
            ? store.sourceSeason(scope.sourceBindingId())
            : store.controlSeason(scope.controlId());
    if (seasonId != null) seasons.lockCollectionState(seasonId);
    Cycle cycle = store.lockCycle(id);
    if (cycle.state() != CollectionCycleStateEnum.RUNNING)
      throw CollectionConflictException.invalidContext();
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
    runtimeAccess.requireCurrent(scope.incarnationId());
    if (scope.controlId() == null) throw CollectionConflictException.invalidContext();
    UUID seasonId = store.controlSeason(scope.controlId());
    if (seasonId != null) seasons.lockCollectionState(seasonId);
    return store.lockCycleForUpdate(id);
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
    if (cycle.controlId() == null) throw CollectionConflictException.invalidContext();
    return cycle;
  }
}
