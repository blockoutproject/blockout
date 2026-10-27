package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Prepares immutable launch references using existing runtime, season and account transactions. */
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
   * @param revision preparation revision read before editing
   * @param provider designated qualification authority
   * @param organizerReference expected native organizer or championship
   * @param candidateUrl proposed HTTP URL without credentials
   * @return unqualified source, without fetching or accepting the URL
   */
  @Transactional
  public Source create(
      UUID accountId,
      UUID seasonId,
      long revision,
      CollectionProviderEnum provider,
      String organizerReference,
      URI candidateUrl) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    CollectionRevision.requireAdvance(season.collectionRevision());
    CollectionRevision.requireRevision(revision, season.collectionRevision());
    SourceReference.requireUrl(candidateUrl, false);
    if (!StringUtils.hasText(organizerReference)) throw new InvalidSourceException();
    if (store.source(seasonId, provider, organizerReference).isPresent())
      throw new CollectionConflictException("conflict");
    Source created =
        store.createSource(seasonId, provider, organizerReference, candidateUrl.toString());
    seasons.updatePreparation(seasonId, false);
    return created;
  }

  /**
   * Replaces a candidate and invalidates evidence only when its URL changes.
   *
   * @param accountId current local operator
   * @param sourceId unlaunched and unlocked binding
   * @param revision source revision read before editing
   * @param candidateUrl entire replacement candidate
   * @return saved candidate with prior evidence cleared
   */
  @Transactional
  public Source setCandidate(UUID accountId, UUID sourceId, long revision, URI candidateUrl) {
    Source source = editable(accountId, sourceId, revision);
    SourceReference.requireUrl(candidateUrl, false);
    if (candidateUrl.toString().equals(source.candidateUrl()))
      return configurationReads.sourceView(source);
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
   * @param revision current editing revision
   * @return pending source, never a claim that validation has started or succeeded
   */
  @Transactional
  public Source requestValidation(UUID accountId, UUID sourceId, long revision) {
    Source source = editable(accountId, sourceId, revision);
    if (source.candidateUrl() == null) throw new CollectionConflictException("conflict");
    if (configurationReads.sourceView(source).validationState()
        == SourceValidationStateEnum.PENDING) return source;
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
   * @param revision current editing revision
   * @param label exact canonical season label, without trimming or normalization
   * @return qualified candidate without locking or launching it
   */
  @Transactional
  public Source confirmSeason(UUID accountId, UUID sourceId, long revision, String label) {
    Source source = editable(accountId, sourceId, revision);
    if (source.validationState() != SourceValidationStateEnum.CONFIRMATION_REQUIRED
        || !seasonReads.collectionState(source.seasonId()).label().equals(label))
      throw new CollectionConflictException("conflict");
    return changes.save(
        source.toBuilder()
            .validationState(SourceValidationStateEnum.QUALIFIED)
            .seasonConfirmed(true)
            .build());
  }

  /**
   * Locks all selected qualified references atomically without changing sporting mappings.
   *
   * @param accountId current local operator
   * @param seasonId canonical open season
   * @param revision current preparation revision
   * @param selected complete explicit selection; one invalid member refuses the entire command
   * @return resulting canonical season state
   */
  @Transactional
  public CollectionSeasonView launch(
      UUID accountId, UUID seasonId, long revision, Set<UUID> selected) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    List<Source> sources =
        store.sources(seasonId).stream().filter(source -> selected.contains(source.id())).toList();
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    CollectionRevision.requireAdvance(season.collectionRevision());
    CollectionRevision.requireRevision(revision, season.collectionRevision());
    if (selected.isEmpty()
        || sources.size() != selected.size()
        || sources.stream()
            .anyMatch(
                source ->
                    source.validationState() != SourceValidationStateEnum.QUALIFIED
                        || (source.locked() ? source.acceptedUrl() : source.candidateUrl())
                            == null)) throw new CollectionConflictException("conflict");
    boolean changed = false;
    for (Source source : sources) {
      if (source.launched()) continue;
      CollectionRevision.requireAdvance(source.revision());
      store.saveSource(
          source.toBuilder()
              .locked(true)
              .launched(true)
              .acceptedUrl(source.locked() ? source.acceptedUrl() : source.candidateUrl())
              .build());
      store.ensureSeasonControl(seasonId, source.provider());
      changed = true;
    }
    return changed ? seasons.updatePreparation(seasonId, true) : season;
  }

  /**
   * Acquires runtime, season and source before locking the account and checking its current grant.
   *
   * @param accountId original local account
   * @param sourceId candidate identity
   * @param revision operator's editing revision
   * @return editable source under transaction-held locks
   */
  private Source editable(UUID accountId, UUID sourceId, long revision) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(store.sourceSeason(sourceId));
    Source source = store.lockSource(sourceId);
    authorization.require(accountId, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    CollectionRevision.requireAdvance(season.collectionRevision());
    CollectionRevision.requireRevision(revision, source.revision());
    CollectionRevision.requireAdvance(source.revision());
    if (source.locked()) throw new CollectionConflictException("conflict");
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
