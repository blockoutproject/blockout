package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.SeasonService;
import java.net.URI;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resolves qualified entry proposals through canonical seasons and existing source preparation. */
@Service
@RequiredArgsConstructor
public class CollectionSourceService {
  private final CollectionStore store;
  private final CollectorRuntimeService runtimes;
  private final SeasonService seasons;

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
   *
   * @param proposal attributable entry evidence from the current authenticated collector
   * @return canonical season and root binding; repeated proposals have no additional effect
   * @throws CollectionConflictException when the incarnation is obsolete or the season is closed
   */
  @Transactional
  public Resolved observe(Proposal proposal) {
    runtimes.requireCurrent(proposal.incarnationId());
    requireUrl(proposal.candidateUrl());
    requireUrl(proposal.evidenceUrl());
    CollectionSeasonView season =
        seasons.lockCollectionState(seasons.getOrCreate(proposal.startYear()).id());
    if (season.collectionState() == CollectionSeasonStateEnum.CLOSED)
      throw new CollectionConflictException("conflict");
    Optional<Source> existing =
        store.source(season.id(), proposal.provider(), proposal.organizerReference());
    if (existing.isPresent()) return new Resolved(season.id(), existing.orElseThrow().id());
    CollectorRuntimeService.requireAdvance(season.collectionRevision());
    Source created =
        store.createSource(
            season.id(),
            proposal.provider(),
            proposal.organizerReference(),
            proposal.candidateUrl().toString());
    seasons.updatePreparation(season.id(), false);
    return new Resolved(season.id(), created.id());
  }

  /**
   * Rejects credentials and non-HTTP references; source-specific scope remains collector-owned.
   *
   * @param uri qualified candidate or entry URL
   */
  private void requireUrl(URI uri) {
    if (uri == null
        || uri.getHost() == null
        || uri.getUserInfo() != null
        || uri.getFragment() != null
        || !("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())))
      throw new InvalidSourceException();
  }
}
