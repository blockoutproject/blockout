package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Prepares verified historical references and authorizes season-wide sporting activation. */
@Service
@RequiredArgsConstructor
public class PrepareCollectionSources {
  private final CollectionStore store;
  private final ReadCollectionConfiguration configurationReads;
  private final ChangeCollectionSourceState changes;
  private final ChangeCollectionSeasons seasons;
  private final ReadCollectionSeasons seasonReads;
  private final ActionAuthorization authorization;

  /**
   * Adds a candidate; only later collector qualification can establish supported scope.
   *
   * @param accountId current local operator
   * @param seasonId canonical open season
   * @param provider designated qualification authority
   * @param organizerReference expected native organizer or championship
   * @param candidateUrl proposed HTTP URL without credentials
   * @return unqualified source, without fetching or accepting the URL
   */
  @Transactional
  public Source create(
      UUID accountId,
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      URI candidateUrl) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    SourceReference.requireUrl(candidateUrl, false);
    if (!StringUtils.hasText(organizerReference)) {
      throw new InvalidSourceException();
    }
    if (store.source(seasonId, provider, organizerReference).isPresent()) {
      throw new CollectionConflictException("conflict");
    }
    return store.createSource(seasonId, provider, organizerReference, candidateUrl.toString());
  }

  /**
   * Replaces a candidate and invalidates evidence only when its URL changes.
   *
   * @param accountId current local operator
   * @param sourceId unlaunched and unlocked binding
   * @param candidateUrl entire replacement candidate
   * @return saved candidate with prior evidence cleared
   */
  @Transactional
  public Source setCandidate(UUID accountId, UUID sourceId, URI candidateUrl) {
    Source source = editable(accountId, sourceId);
    SourceReference.requireUrl(candidateUrl, false);
    if (candidateUrl.toString().equals(source.candidateUrl())) {
      return configurationReads.sourceView(source);
    }
    Source changed =
        clearEvidence(source)
            .candidateUrl(candidateUrl.toString())
            .validationState(SourceValidationStateEnum.UNVALIDATED)
            .build();
    return changes.save(changed);
  }

  /**
   * Records explicit qualification intent; an identical pending request admits no duplicate.
   *
   * @param accountId current local operator
   * @param sourceId unlocked candidate in an open season
   * @return pending source, never a claim that validation has started or succeeded
   */
  @Transactional
  public Source requestValidation(UUID accountId, UUID sourceId) {
    Source source = editable(accountId, sourceId);
    if (source.candidateUrl() == null) {
      throw new CollectionConflictException("conflict");
    }
    if (configurationReads.sourceView(source).validationState()
        == SourceValidationStateEnum.PENDING) {
      return source;
    }
    UUID previousCycle = source.currentCycleId();
    Source pending =
        changes.save(
            clearEvidence(source)
                .validationState(SourceValidationStateEnum.PENDING)
                .currentCycleId(null)
                .build());
    store.discardCycle(previousCycle);
    return pending;
  }

  /**
   * Supplies only missing attribution after the collector established compatible structure.
   *
   * @param accountId current local operator
   * @param sourceId compatible unlocked candidate
   * @param label exact canonical season label, without trimming or normalization
   * @return qualified candidate without locking or launching it
   */
  @Transactional
  public Source confirmSeason(UUID accountId, UUID sourceId, String label) {
    Source source = editable(accountId, sourceId);
    if (source.validationState() != SourceValidationStateEnum.CONFIRMATION_REQUIRED
        || !seasonReads.collectionState(source.seasonId()).label().equals(label)) {
      throw new CollectionConflictException("conflict");
    }
    return changes.save(
        source.toBuilder()
            .validationState(SourceValidationStateEnum.QUALIFIED)
            .seasonConfirmed(true)
            .build());
  }

  /**
   * Enables ordinary sporting acquisition in the canonical season. Source reads, mappings and
   * independently paused providers keep their existing states. A pending historical request must be
   * admitted first because activation would otherwise make it ineligible to start.
   *
   * @param accountId current local operator
   * @param seasonId canonical open season
   * @return resulting canonical season state
   */
  @Transactional
  public CollectionSeasonView activate(UUID accountId, UUID seasonId) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    if (season.collectionState() == CollectionSeasonStateEnum.ACTIVE) {
      return season;
    }
    if (store.controls(seasonId).stream()
        .anyMatch(control -> control.requestedMode() == CollectionModeEnum.INITIAL_IMPORT)) {
      throw new CollectionConflictException("conflict");
    }
    return seasons.activateCollectionSeason(seasonId);
  }

  /**
   * Acquires runtime, season and source before locking the account and checking its current grant.
   *
   * @param accountId original local account
   * @param sourceId candidate identity
   * @return editable source under transaction-held locks
   */
  private Source editable(UUID accountId, UUID sourceId) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(store.sourceSeason(sourceId));
    Source source = store.lockSource(sourceId);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    if (source.locked()) {
      throw new CollectionConflictException("conflict");
    }
    return source;
  }

  /**
   * Clears evidence for a changed candidate or a new explicit validation request.
   *
   * @param source previously persisted candidate
   * @return focused copy builder retaining immutable identity and current cycle until replaced
   */
  private CollectionState.Source.SourceBuilder clearEvidence(Source source) {
    return source.toBuilder()
        .validatedAt(null)
        .seasonEvidence(null)
        .reason(null)
        .reasonType(null)
        .seasonConfirmed(false);
  }
}
