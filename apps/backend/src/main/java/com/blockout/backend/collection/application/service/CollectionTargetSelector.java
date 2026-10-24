package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Selects current eligible reads in bounded owner pages, keeping personal locality out of
 * snapshots.
 */
@Service
@RequiredArgsConstructor
public class CollectionTargetSelector {
  private final CollectionStore store;
  private final SportingReadService sporting;
  private final SeasonService seasons;
  private final ClubAcquisitionService clubs;

  /**
   * Persists the due or explicitly requested scope inside the admission transaction. Mutable club
   * and pool eligibility advances by identity so changes behind a visited boundary cannot repeat or
   * skip retained resources; newly eligible earlier identities wait for the next admission.
   *
   * @param cycle current admitted context, not yet returned to the collector
   * @param control locked family and exact pending selections
   * @param season locked canonical season, absent for the two seasonless families
   */
  public void freeze(Cycle cycle, Control control, CollectionSeasonView season) {
    if (season == null) {
      if (control.family() != CollectionFamilyEnum.CLUB_SHEETS
          && control.family() != CollectionFamilyEnum.GEOCODING) throw invalid();
      UUID afterClub = null;
      while (true) {
        ClubAcquisitionService.TargetBatch references =
            clubs.targets(
                control.id(),
                control.family() == CollectionFamilyEnum.GEOCODING,
                cycle.mode() != CollectionModeEnum.PERIODIC,
                afterClub);
        if (references.lastClubId() == null) break;
        retainDue(cycle, control, references.items());
        afterClub = references.lastClubId();
      }
      return;
    }
    CollectionProviderEnum provider =
        switch (control.family()) {
          case FFVB -> CollectionProviderEnum.FFVB;
          case LNV -> CollectionProviderEnum.LNV;
          default -> throw invalid();
        };
    List<Source> sources =
        store.sources(season.id()).stream()
            .filter(source -> source.provider() == provider)
            .filter(
                source ->
                    cycle.mode() == CollectionModeEnum.INITIAL_IMPORT
                        ? control.sourceBindingIds().contains(source.id())
                        : source.launched())
            .toList();
    if (sources.isEmpty()
        || (cycle.mode() == CollectionModeEnum.INITIAL_IMPORT
            && sources.size() != control.sourceBindingIds().size())) throw invalid();
    boolean lockedReference = false;
    for (Source candidate : sources) {
      Source source;
      if (candidate.validationState() != SourceValidationStateEnum.QUALIFIED
          || (candidate.locked() ? candidate.acceptedUrl() : candidate.candidateUrl()) == null)
        throw invalid();
      if (!candidate.locked()) {
        CollectorRuntimeService.requireAdvance(candidate.revision());
        source = store.lockAcceptedSource(candidate);
        lockedReference = true;
      } else {
        source = candidate;
      }
      retainDue(
          cycle,
          control,
          List.of(
              Target.builder()
                  .scopeId(source.id())
                  .kind(CollectionTargetKindEnum.DISCOVERY)
                  .sourceBindingId(source.id())
                  .url(source.acceptedUrl())
                  .seasonLabel(season.label())
                  .provider(source.provider())
                  .organizerReference(source.organizerReference())
                  .build()));
      UUID afterPool = null;
      while (true) {
        List<AcquisitionReference> references =
            sporting.acquisitionPools(
                season.id(),
                provider,
                source.organizerReference(),
                cycle.mode() == CollectionModeEnum.INITIAL_IMPORT,
                cycle.startedAt(),
                afterPool);
        if (references.isEmpty()) break;
        retainDue(
            cycle,
            control,
            references.stream().map(reference -> target(reference, source, season)).toList());
        if (provider == CollectionProviderEnum.LNV) {
          for (UUID poolId :
              references.stream().map(AcquisitionReference::poolId).distinct().toList()) {
            for (int detailPage = 0; ; detailPage++) {
              List<AcquisitionReference> details =
                  sporting.acquisitionDetails(poolId, cycle.startedAt(), detailPage);
              if (details.isEmpty()) break;
              retainDue(
                  cycle,
                  control,
                  details.stream().map(reference -> target(reference, source, season)).toList());
            }
          }
        }
        afterPool = references.getLast().poolId();
      }
    }
    if (lockedReference) {
      CollectorRuntimeService.requireAdvance(season.collectionRevision());
      seasons.updatePreparation(season.id(), false);
    }
  }

  /**
   * Resolves current permitted localities once per served page, preserving target order.
   *
   * @param targets bounded page of frozen references without personal values
   * @return current permitted locality for geocoding only; removal/restriction forbids a query
   */
  public List<ServedTarget> serve(List<Target> targets) {
    return clubs.serve(targets);
  }

  /**
   * Combines qualified owner context without copying personal locality.
   *
   * @param reference eligible F02-owned identity/current configuration
   * @param source qualified competition source binding
   * @param season owning canonical competition season
   * @return frozen nonpersonal acquisition context
   */
  private Target target(
      AcquisitionReference reference, Source source, CollectionSeasonView season) {
    CollectionState.Target.TargetBuilder result =
        Target.builder()
            .scopeId(reference.scopeId())
            .kind(reference.kind())
            .url(reference.url())
            .poolId(reference.poolId())
            .matchId(reference.matchId())
            .packReference(reference.packReference())
            .provider(reference.provider())
            .nativeMatchReference(reference.nativeMatchReference())
            .fastWindowEndsAt(reference.fastWindowEndsAt())
            .sourceBindingId(source.id())
            .organizerReference(source.organizerReference())
            .seasonLabel(season.label());
    PoolKey key = reference.poolKey();
    if (key != null)
      result
          .competitionReference(key.competitionReference())
          .poolReference(key.reference())
          .tourReference(key.tourReference())
          .groupReference(key.groupReference());
    if (reference.classification() != null)
      result
          .divisionId(reference.classification().divisionId())
          .format(reference.classification().format())
          .gender(reference.classification().gender());
    return result.build();
  }

  /**
   * Retains explicit or due targets with their actual evidence.
   *
   * @param cycle admitted purpose and logical time
   * @param control exact authorized selection
   * @param targets one bounded batch of eligible references
   */
  private void retainDue(Cycle cycle, Control control, List<Target> targets) {
    Map<AttemptKey, CollectionAttempt> attempts =
        store
            .attempts(control.id(), targets.stream().map(Target::scopeId).distinct().toList())
            .stream()
            .collect(
                Collectors.toMap(
                    attempt -> new AttemptKey(attempt.scopeId(), attempt.stage()),
                    Function.identity()));
    List<Target> selected =
        targets.stream()
            .filter(
                target ->
                    control.scopeIds().isEmpty() || control.scopeIds().contains(target.scopeId()))
            .map(
                target -> {
                  CollectionAttempt attempt =
                      attempts.get(
                          new AttemptKey(
                              target.scopeId(),
                              CollectionStageEnum.fromValue(target.kind().getValue())));
                  return attempt == null
                      ? target
                      : target.toBuilder()
                          .lastAttemptAt(attempt.lastAttemptAt())
                          .lastSuccessAt(attempt.lastSuccessAt())
                          .build();
                })
            .filter(
                target ->
                    cycle.mode() != CollectionModeEnum.PERIODIC || due(target, cycle.startedAt()))
            .toList();
    store.addTargets(cycle.id(), selected);
  }

  /**
   * Applies the accepted cadence to actual attempts.
   *
   * @param target qualified target with actual prior attempt
   * @param now current admission instant
   * @return whether its ordinary cadence is due; a never-attempted target is immediately eligible
   */
  static boolean due(Target target, Instant now) {
    if (target.lastAttemptAt() == null) return true;
    Duration cadence =
        switch (target.kind()) {
          case DISCOVERY -> Duration.ofMinutes(30);
          case CALENDAR, STANDINGS ->
              Duration.ofMinutes(target.fastWindowEndsAt() == null ? 30 : 5);
          case DETAILS -> Duration.ofMinutes(target.fastWindowEndsAt() == null ? 60 : 5);
          case CLUB_SHEET -> Duration.ofDays(1);
          case GEOCODING -> Duration.ofHours(1);
        };
    return !now.isBefore(target.lastAttemptAt().plus(cadence));
  }

  /** Scope/stage distinguishes independent actual attempts in one bounded lookup. */
  private record AttemptKey(UUID scopeId, CollectionStageEnum stage) {}

  /**
   * Creates the canonical incomplete-configuration refusal.
   *
   * @return safe refusal for incomplete or conflicting acquisition configuration
   */
  private CollectionConflictException invalid() {
    return new CollectionConflictException("invalid-cycle-context");
  }
}
