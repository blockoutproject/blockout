package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionStageMapper;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.CycleScope;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
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
  private final ReadSportingAcquisition acquisitionReads;
  private final CollectionStageMapper stages;

  /** The authorized scope and the cycle already read under the caller's transaction fence. */
  public record AdmittedScope<T>(Cycle cycle, T scope) {}

  /**
   * Authorizes source artwork only through an existing admitted calendar membership. The sporting
   * owner supplies retained pool identities; this method acquires the runtime/season/cycle fence
   * before any sporting root or account lock, and holds it through the caller's commit. Parent
   * resolution shares the result-recording query and does not load one target per pool.
   *
   * @param id current cycle
   * @param poolIds memberships read by the sporting owner, never supplied by the HTTP caller
   * @return locked cycle and exact admitted parent-calendar capability
   * @throws CollectionConflictException when the cycle is obsolete, terminal or candidate-only, or
   *     none of these memberships is admitted
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public AdmittedScope<Target> requireTeamLogo(UUID id, List<UUID> poolIds) {
    Cycle cycle = requireRunningControl(id);
    return new AdmittedScope<>(cycle, teamLogoTarget(id, poolIds));
  }

  /**
   * Authorizes an existing match through its exact detail role or its admitted parent calendar.
   *
   * @param id current cycle
   * @param matchId known match identity resolved by the sporting owner
   * @param poolId immutable owning pool resolved by the sporting owner
   * @return locked cycle and frozen detail or parent calendar context
   * @throws CollectionConflictException when the cycle is obsolete, terminal or candidate-only, or
   *     neither the match detail nor its parent calendar is admitted
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public AdmittedScope<Target> requireDetail(UUID id, UUID matchId, UUID poolId) {
    Cycle cycle = requireRunningControl(id);
    return new AdmittedScope<>(cycle, detailTarget(id, matchId, () -> Optional.of(poolId)));
  }

  /**
   * Resolves an admitted catalog's canonical source after its runtime and season are fenced.
   *
   * @param id current control cycle
   * @param sourceId exact source-season binding
   * @return locked cycle and current source identity
   * @throws CollectionConflictException when the cycle is not an active control, catalog discovery
   *     is outside its admitted scope, or the source binding is absent
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public AdmittedScope<Source> requireCatalogSource(UUID id, UUID sourceId) {
    Cycle cycle = requireRunningControl(id);
    exactTarget(id, sourceId, CollectionTargetKindEnum.DISCOVERY);
    Source source = store.source(sourceId).orElseThrow(CollectionConflictException::invalidContext);
    return new AdmittedScope<>(cycle, source);
  }

  /**
   * Authorizes one exact sporting role while retaining runtime, season and cycle locks through
   * commit.
   *
   * @param id current control cycle
   * @param scopeId addressed source or pool identity
   * @param kind required acquisition role
   * @return locked cycle and frozen admitted target
   * @throws CollectionConflictException when the cycle is not an active control or the exact
   *     scope/role was not admitted
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public AdmittedScope<Target> requireTarget(UUID id, UUID scopeId, CollectionTargetKindEnum kind) {
    Cycle cycle = requireRunningControl(id);
    return new AdmittedScope<>(cycle, exactTarget(id, scopeId, kind));
  }

  /** Resolves result attribution under the exclusive passage lock held by the result writer. */
  Target resultTarget(Cycle cycle, UUID scopeId, CollectionStageEnum stage) {
    UUID id = cycle.id();
    return switch (stage) {
      case LOGO -> teamLogoTarget(id, acquisitionReads.teamPools(scopeId));
      case DETAILS -> detailTarget(id, scopeId, () -> acquisitionReads.matchPoolId(scopeId));
      default -> exactTarget(id, scopeId, stages.toTargetKind(stage));
    };
  }

  private Target exactTarget(UUID id, UUID scopeId, CollectionTargetKindEnum kind) {
    return store.target(id, scopeId, kind).orElseThrow(CollectionConflictException::invalidContext);
  }

  private Target teamLogoTarget(UUID id, List<UUID> poolIds) {
    return store
        .firstTarget(id, poolIds, CollectionTargetKindEnum.CALENDAR)
        .orElseThrow(CollectionConflictException::invalidContext);
  }

  private Target detailTarget(UUID id, UUID matchId, Supplier<Optional<UUID>> parentPool) {
    return store
        .target(id, matchId, CollectionTargetKindEnum.DETAILS)
        .or(
            () ->
                parentPool
                    .get()
                    .flatMap(pool -> store.target(id, pool, CollectionTargetKindEnum.CALENDAR)))
        .orElseThrow(CollectionConflictException::invalidContext);
  }

  /**
   * Acquires the running capability in runtime-first lock order.
   *
   * @param id retained context
   * @return running context under runtime, season and shared cycle locks, in that order
   * @throws CollectionConflictException when the incarnation is superseded or the cycle is terminal
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  private Cycle requireRunning(UUID id) {
    CycleScope scope = store.cycleScope(id);
    runtimeAccess.requireCurrent(scope.incarnationId());
    UUID seasonId =
        scope.controlId() == null
            ? store.sourceSeason(scope.sourceBindingId())
            : store.controlSeason(scope.controlId());
    if (seasonId != null) {
      seasons.lockCollectionState(seasonId);
    }
    Cycle cycle = store.lockCycle(id);
    if (cycle.state() != CollectionCycleStateEnum.RUNNING) {
      throw CollectionConflictException.invalidContext();
    }
    return cycle;
  }

  /**
   * Locks a control passage for result recording or idempotent completion.
   *
   * @param id retained control context
   * @return exclusively locked current cycle, possibly already completed
   * @throws CollectionConflictException for candidate or superseded context
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Cycle lockControlPassage(UUID id) {
    CycleScope scope = store.cycleScope(id);
    runtimeAccess.requireCurrent(scope.incarnationId());
    if (scope.controlId() == null) {
      throw CollectionConflictException.invalidContext();
    }
    UUID seasonId = store.controlSeason(scope.controlId());
    if (seasonId != null) {
      seasons.lockCollectionState(seasonId);
    }
    return store.lockCycleForUpdate(id);
  }

  /**
   * Supplies a runtime-first, transaction-held capability to sporting/result owners.
   *
   * @param id admitted cycle; caller must invoke this before taking domain/account locks
   * @return running control context; validation contexts cannot authorize sporting writes
   * @throws CollectionConflictException for completed, superseded or candidate-only context
   * @throws CollectionNotFoundException when the retained cycle is unknown
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Cycle requireRunningControl(UUID id) {
    Cycle cycle = requireRunning(id);
    if (cycle.controlId() == null) {
      throw CollectionConflictException.invalidContext();
    }
    return cycle;
  }
}
