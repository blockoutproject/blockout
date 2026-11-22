package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSourceScopeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.net.URI;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Associates qualified current official entries with canonical season and control owners. */
@Service
@RequiredArgsConstructor
public class ObserveCollectionSource {
  private final CollectionStore store;
  private final CollectorRuntimeAccess runtimeAccess;
  private final ChangeCollectionSeasons seasons;
  private final ApplicationEventPublisher events;

  /** Qualified discovery evidence; the collector owns provider interpretation, never lifecycle. */
  public record Proposal(
      UUID incarnationId,
      long startYear,
      CollectionProviderEnum provider,
      String organizerReference,
      URI candidateUrl,
      URI evidenceUrl,
      Instant observedAt,
      String displayName,
      CollectionSourceScopeEnum scope) {}

  /** Existing owner identities returned without activation or assumed sporting classification. */
  public record Resolved(UUID seasonId, UUID sourceBindingId) {}

  /**
   * Accepts a season-attributed official root for ordinary catalogue reads. An already locked
   * reference is immutable; evidence for a different URL cannot replace or qualify it.
   *
   * @param proposal attributable entry evidence from the current authenticated collector
   * @return canonical season and root binding; repeated proposals preserve accepted references
   * @throws CollectionConflictException when the incarnation is obsolete or the season is closed
   */
  @Transactional
  public Resolved observe(Proposal proposal) {
    runtimeAccess.requireCurrent(proposal.incarnationId());
    SourceReference.requireUrl(proposal.candidateUrl(), true);
    SourceReference.requireUrl(proposal.evidenceUrl(), true);
    CollectionSeasonView season =
        seasons.lockCollectionState(seasons.getOrCreate(proposal.startYear()).id());
    CollectionLifecycle.requireOpen(season);
    Optional<Source> existing =
        store.source(season.id(), proposal.provider(), proposal.organizerReference());
    String officialUrl = proposal.candidateUrl().toString();
    Source source =
        existing.orElseGet(
            () ->
                store.createSource(
                    season.id(), proposal.provider(), proposal.organizerReference(), officialUrl));
    if (!source.locked()
        && (existing.isEmpty() || mayQualify(source, season.collectionState(), officialUrl))) {
      admitOrdinarySource(
          withPresentation(source, proposal).toBuilder()
              .candidateUrl(officialUrl)
              .acceptedUrl(officialUrl)
              .locked(true)
              .launched(true)
              .validationState(SourceValidationStateEnum.QUALIFIED)
              .validatedAt(proposal.observedAt())
              .seasonEvidence(season.label())
              .reason(null)
              .reasonType(null)
              .seasonConfirmed(false)
              .currentCycleId(null)
              .build());
      store.discardCycle(source.currentCycleId());
    } else if (source.locked() && officialUrl.equals(source.acceptedUrl())) {
      Source presented = withPresentation(source, proposal);
      if (!source.launched()) {
        admitOrdinarySource(presented.toBuilder().launched(true).build());
      } else if (!presented.equals(source)) {
        store.saveSource(presented);
      }
    }
    if (existing.isEmpty()) {
      events.publishEvent(
          new CollectionOperationalDiagnostics.SourceObserved(
              season.id(), proposal.provider(), proposal.observedAt()));
    }
    return new Resolved(season.id(), source.id());
  }

  /** Fills missing presentation evidence without renaming a known seasonal binding on a retry. */
  private Source withPresentation(Source source, Proposal proposal) {
    CollectionSourceScopeEnum scope =
        source.provider() == CollectionProviderEnum.FFVB ? proposal.scope() : null;
    if (source.scope() != null && scope != null && source.scope() != scope) {
      return source;
    }
    String name = proposal.displayName();
    return source.toBuilder()
        .displayName(
            source.displayName() == null && name != null && !name.isBlank()
                ? name.strip()
                : source.displayName())
        .scope(scope == null ? source.scope() : scope)
        .build();
  }

  /** First ordinary use of a historical-only control is independent of explicit later pauses. */
  private void admitOrdinarySource(Source source) {
    Control control = store.ensureSeasonControl(source.seasonId(), source.provider(), true);
    if (!control.enabled() && !store.hasOrdinarySources(source.seasonId(), source.provider())) {
      CollectionRevision.requireAdvance(control.revision());
      store.setControlIntent(control.id(), true, control.requestId(), control.requestedMode());
    }
    CollectionRevision.requireAdvance(source.revision());
    store.saveSource(source);
  }

  /** A reserved historical reference stays private to preparation until its season activates. */
  private boolean mayQualify(
      Source source, CollectionSeasonStateEnum seasonState, String officialUrl) {
    if (store
        .initialCoverage(
            source.id(),
            source.id(),
            CollectionStageEnum.DISCOVERY,
            CollectionPhaseEnum.ACQUISITION)
        .isEmpty()) {
      return true;
    }
    return seasonState == CollectionSeasonStateEnum.ACTIVE
        && officialUrl.equals(source.candidateUrl())
        && (source.currentCycleId() == null
            || store
                .cycle(source.currentCycleId())
                .filter(
                    cycle ->
                        cycle.state() == CollectionCycleStateEnum.RUNNING
                            && cycle.revision() == source.revision())
                .isEmpty());
  }
}
