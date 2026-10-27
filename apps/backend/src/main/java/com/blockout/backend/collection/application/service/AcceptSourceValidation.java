package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.SourceValidation;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Accepts a terminal result only for the unchanged admitted candidate and commits completion with
 * it.
 */
@Service
@RequiredArgsConstructor
public class AcceptSourceValidation {
  private final CollectionStore store;
  private final CollectorRuntimeAccess runtimeAccess;
  private final ChangeCollectionSeasons seasons;
  private final ChangeCollectionSourceState changes;

  /**
   * Commits qualification and completion together for the exact unchanged admitted candidate.
   *
   * @param sourceId expected binding owner
   * @param result actual terminal evidence from the dedicated collector
   * @return accepted qualification; an identical terminal repetition has no effects
   */
  @Transactional
  public Source submitValidation(UUID sourceId, SourceValidation result) {
    CollectionState.CycleScope scope = store.cycleScope(result.cycleId());
    runtimeAccess.requireCurrent(scope.incarnationId());
    if (!sourceId.equals(scope.sourceBindingId()))
      throw CollectionConflictException.invalidContext();
    CollectionSeasonView season = seasons.lockCollectionState(store.sourceSeason(sourceId));
    Cycle cycle = store.lockCycleForUpdate(result.cycleId());
    Source source = store.lockSource(sourceId);
    CollectionLifecycle.requireOpen(season);
    CollectionRevision.requireAdvance(season.collectionRevision());
    if (!cycle.id().equals(source.currentCycleId()))
      throw CollectionConflictException.invalidContext();
    Instant observedAt = result.observedAt().truncatedTo(ChronoUnit.MICROS);
    if (cycle.completedAt() != null) {
      SourceValidationStateEnum acceptedState =
          source.seasonConfirmed()
              ? SourceValidationStateEnum.CONFIRMATION_REQUIRED
              : source.validationState();
      if (acceptedState != result.state()
          || !Objects.equals(source.validatedAt(), observedAt)
          || !Objects.equals(source.seasonEvidence(), result.seasonEvidence())
          || !Objects.equals(source.reason(), result.reason())
          || !Objects.equals(source.reasonType(), result.reasonType()))
        throw CollectionConflictException.invalidContext();
      return source;
    }
    if (source.locked()
        || source.validationState() != SourceValidationStateEnum.PENDING
        || source.revision() != cycle.revision()
        || observedAt.isBefore(cycle.startedAt()))
      throw CollectionConflictException.invalidContext();
    if (result.state() != SourceValidationStateEnum.INVALID
        && result.state() != SourceValidationStateEnum.CONFIRMATION_REQUIRED
        && result.state() != SourceValidationStateEnum.QUALIFIED)
      throw new InvalidSourceException();
    if (result.state() == SourceValidationStateEnum.QUALIFIED
        && !StringUtils.hasText(result.seasonEvidence())) throw new InvalidSourceException();
    Source accepted =
        changes.save(
            source.toBuilder()
                .validationState(result.state())
                .validatedAt(observedAt)
                .seasonEvidence(result.seasonEvidence())
                .reason(result.reason())
                .reasonType(result.reasonType())
                .seasonConfirmed(false)
                .build());
    store.complete(cycle, observedAt);
    return accepted;
  }
}
