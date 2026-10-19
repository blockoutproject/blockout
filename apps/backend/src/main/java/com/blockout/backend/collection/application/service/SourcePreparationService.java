package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.SourceValidation;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResourcePage;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Prepares immutable launch references using existing runtime, season and account transactions. */
@Service
@RequiredArgsConstructor
public class SourcePreparationService {
  private final CollectionStore store;
  private final CollectorRuntimeService runtimes;
  private final SeasonService seasons;
  private final SportingReadService sporting;
  private final CurrentPermissions permissions;
  private final ActionAuthorization authorization;

  /**
   * Reads the complete canonical season configuration without discovery or provider calls.
   *
   * @param accountId current local operator
   * @return newest-first configuration, including closed history
   */
  @Transactional(readOnly = true)
  public List<CollectionSeasonView> seasons(UUID accountId) {
    requireRead(accountId);
    return seasons.collectionStates();
  }

  /**
   * Reads one canonical preparation revision without changing it.
   *
   * @param accountId current local operator
   * @param seasonId canonical season
   * @return current preparation state
   */
  @Transactional(readOnly = true)
  public CollectionSeasonView season(UUID accountId, UUID seasonId) {
    requireRead(accountId);
    return seasons.collectionState(seasonId);
  }

  /**
   * Lists supported and proposed roots without classification readiness.
   *
   * @param accountId current local operator
   * @param seasonId canonical season
   * @return ordered source configuration, projecting obsolete validation honestly
   */
  @Transactional(readOnly = true)
  public List<Source> list(UUID accountId, UUID seasonId) {
    requireRead(accountId);
    seasons.collectionState(seasonId);
    return store.sources(seasonId).stream().map(this::project).toList();
  }

  /**
   * Reads current source evidence without requeuing an interrupted validation.
   *
   * @param accountId current local operator
   * @param sourceId binding identity
   * @return current candidate and accepted reference
   */
  @Transactional(readOnly = true)
  public Source get(UUID accountId, UUID sourceId) {
    requireRead(accountId);
    return project(store.source(sourceId).orElseThrow(CollectionNotFoundException::new));
  }

  /**
   * Reads bounded discovered children without contacting a provider or filtering by mapping.
   *
   * @param accountId current local operator
   * @param sourceId selected source binding
   * @param parentId optional pack in this binding
   * @param page validated zero-based page
   * @param size validated size, at most 200
   * @return native direct children without classification state
   */
  @Transactional(readOnly = true)
  public CollectionResourcePage children(
      UUID accountId, UUID sourceId, UUID parentId, long page, int size) {
    requireRead(accountId);
    Source source = store.source(sourceId).orElseThrow(CollectionNotFoundException::new);
    if (page > Integer.MAX_VALUE / size) return new CollectionResourcePage(List.of(), page, false);
    return sporting.collectionChildren(
        source.seasonId(),
        source.provider(),
        source.organizerReference(),
        parentId,
        (int) page,
        size);
  }

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
    requireOpen(season);
    requireRevision(revision, season.collectionRevision());
    requireUrl(candidateUrl);
    if (!StringUtils.hasText(organizerReference)) throw new InvalidSourceException();
    if (store.sources(seasonId).stream()
        .anyMatch(
            source ->
                source.provider() == provider
                    && source.organizerReference().equals(organizerReference)))
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
    requireUrl(candidateUrl);
    if (candidateUrl.toString().equals(source.candidateUrl())) return project(source);
    Source changed =
        clearEvidence(source)
            .candidateUrl(candidateUrl.toString())
            .validationState(SourceValidationStateEnum.UNVALIDATED)
            .build();
    return save(changed);
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
    if (source.validationState() == SourceValidationStateEnum.PENDING && !obsolete(source))
      return source;
    UUID previousCycle = source.currentCycleId();
    Source pending =
        save(
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
        || !seasons.collectionState(source.seasonId()).label().equals(label))
      throw new CollectionConflictException("conflict");
    return save(
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
    requireOpen(season);
    requireRevision(revision, season.collectionRevision());
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
      CollectorRuntimeService.requireAdvance(source.revision());
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
   * Commits qualification and completion together for the exact unchanged admitted candidate.
   *
   * @param sourceId expected binding owner
   * @param result actual terminal evidence from the dedicated collector
   * @return accepted qualification; an identical terminal repetition has no effects
   */
  @Transactional
  public Source submitValidation(UUID sourceId, SourceValidation result) {
    CollectionState.CycleScope scope = store.cycleScope(result.cycleId());
    runtimes.requireCurrent(scope.incarnationId());
    if (!sourceId.equals(scope.sourceBindingId())) throw invalidContext();
    CollectionSeasonView season = seasons.lockCollectionState(store.sourceSeason(sourceId));
    Cycle cycle = store.lockCycleForUpdate(result.cycleId());
    Source source = store.lockSource(sourceId);
    requireOpen(season);
    if (!cycle.id().equals(source.currentCycleId())) throw invalidContext();
    Instant observedAt = result.observedAt().truncatedTo(ChronoUnit.MICROS);
    if (cycle.completedAt() != null) {
      SourceValidationStateEnum acceptedState =
          source.seasonConfirmed()
              ? SourceValidationStateEnum.CONFIRMATION_REQUIRED
              : source.validationState();
      if (acceptedState != result.state()
          || !Objects.equals(source.validatedAt(), observedAt)
          || !Objects.equals(source.seasonEvidence(), result.seasonEvidence())
          || !Objects.equals(source.reason(), result.reason())) throw invalidContext();
      return source;
    }
    if (source.locked()
        || source.validationState() != SourceValidationStateEnum.PENDING
        || source.revision() != cycle.revision()
        || observedAt.isBefore(cycle.startedAt())) throw invalidContext();
    if (result.state() != SourceValidationStateEnum.INVALID
        && result.state() != SourceValidationStateEnum.CONFIRMATION_REQUIRED
        && result.state() != SourceValidationStateEnum.QUALIFIED)
      throw new InvalidSourceException();
    if (result.state() == SourceValidationStateEnum.QUALIFIED
        && !StringUtils.hasText(result.seasonEvidence())) throw new InvalidSourceException();
    Source accepted =
        save(
            source.toBuilder()
                .validationState(result.state())
                .validatedAt(observedAt)
                .seasonEvidence(result.seasonEvidence())
                .reason(result.reason())
                .seasonConfirmed(false)
                .build());
    store.complete(cycle, observedAt);
    return accepted;
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
    requireOpen(season);
    requireRevision(revision, source.revision());
    CollectorRuntimeService.requireAdvance(source.revision());
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
        .seasonConfirmed(false);
  }

  /**
   * Publishes one source mutation together with the season's preparation revision.
   *
   * @param source already authorized state change
   * @return flushed source revision
   */
  private Source save(Source source) {
    CollectorRuntimeService.requireAdvance(source.revision());
    Source changed = store.saveSource(source);
    seasons.updatePreparation(source.seasonId(), false);
    return changed;
  }

  /**
   * Prevents obsolete pending work from appearing active without changing persisted state.
   *
   * @param source persisted current source
   * @return unvalidated projection for interrupted or concurrently replaced validation
   */
  private Source project(Source source) {
    return obsolete(source)
        ? source.toBuilder().validationState(SourceValidationStateEnum.UNVALIDATED).build()
        : source;
  }

  /**
   * Checks retained execution state; renewal may remove the loaded cycle between read queries.
   *
   * @param source current binding
   * @return whether an admitted validation was interrupted or replaced; never-admitted intent stays
   *     pending
   */
  private boolean obsolete(Source source) {
    return source.validationState() == SourceValidationStateEnum.PENDING
        && source.currentCycleId() != null
        && store
            .cycle(source.currentCycleId())
            .map(cycle -> cycle.state() == CollectionCycleStateEnum.INTERRUPTED)
            .orElse(true);
  }

  /**
   * Checks the exact current read grant; other management rights confer no collection permission.
   *
   * @param accountId current local operator
   */
  private void requireRead(UUID accountId) {
    if (!permissions.forAccount(accountId).contains(Permission.MANAGE_COLLECTION))
      throw new AccessDeniedException("Collection management is not permitted");
  }

  /**
   * Refuses closed history and exhausted preparation revisions before any mutation.
   *
   * @param season exclusively locked current season
   */
  private void requireOpen(CollectionSeasonView season) {
    if (season.collectionState() == CollectionSeasonStateEnum.CLOSED)
      throw new CollectionConflictException("conflict");
    CollectorRuntimeService.requireAdvance(season.collectionRevision());
  }

  /**
   * Compares revisions without attempting automatic command retries.
   *
   * @param expected revision submitted with the command
   * @param actual current locked revision
   */
  private void requireRevision(long expected, long actual) {
    if (expected != actual) throw new CollectionConflictException("stale-revision");
  }

  /**
   * Accepts only credential-free HTTP candidates; the collector owns supported-format
   * qualification.
   *
   * @param uri candidate supplied by an operator
   */
  private void requireUrl(URI uri) {
    if (uri.getHost() == null
        || uri.getUserInfo() != null
        || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())))
      throw new InvalidSourceException();
  }

  /**
   * Uses the existing safe conflict vocabulary without including submitted provider data.
   *
   * @return refusal of an incompatible admitted context
   */
  private CollectionConflictException invalidContext() {
    return new CollectionConflictException("invalid-cycle-context");
  }
}
