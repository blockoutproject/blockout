package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
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

/** Resolves qualified entry proposals through canonical seasons and existing source preparation. */
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
      Instant observedAt) {}

  /** Existing owner identities returned without activation or assumed sporting classification. */
  public record Resolved(UUID seasonId, UUID sourceBindingId) {}

  /**
   * Creates only a missing unvalidated candidate, preserving every existing operator choice.
   * Accepted observations request an aggregate preparation report after commit.
   *
   * @param proposal attributable entry evidence from the current authenticated collector
   * @return canonical season and root binding; repeated proposals preserve stored choices
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
    Source source;
    if (existing.isPresent()) {
      source = existing.orElseThrow();
    } else {
      CollectionRevision.requireAdvance(season.collectionRevision());
      source =
          store.createSource(
              season.id(),
              proposal.provider(),
              proposal.organizerReference(),
              proposal.candidateUrl().toString());
      seasons.updatePreparation(season.id(), false);
    }
    events.publishEvent(
        new CollectionOperationalDiagnostics.SourceObserved(season.id(), proposal.provider()));
    return new Resolved(season.id(), source.id());
  }
}
