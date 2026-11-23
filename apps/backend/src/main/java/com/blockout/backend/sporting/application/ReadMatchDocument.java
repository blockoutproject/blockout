package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.sporting.application.MatchDocumentSource.Reference;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.net.URI;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Current F02 eligibility is captured in a short read; the detached reference alone crosses HTTP.
 */
@Service
public class ReadMatchDocument {
  private final ReadSportingData owners;
  private final SportingStore store;
  private final MatchDocumentSource source;
  private final TransactionTemplate reads;

  /**
   * Uses the existing database manager for consistent reference/result/visibility reads.
   *
   * @param owners current F02 public admission
   * @param store accepted facts and source identity
   * @param source bounded PDF supplier adapter
   * @param transactions native SQL transaction manager
   */
  public ReadMatchDocument(
      ReadSportingData owners,
      SportingStore store,
      MatchDocumentSource source,
      PlatformTransactionManager transactions) {
    this.owners = owners;
    this.store = store;
    this.source = source;
    reads = new TransactionTemplate(transactions);
    reads.setReadOnly(true);
    reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
  }

  /**
   * Ends SQL before fetching; even a caller's ambient transaction is suspended across HTTP.
   *
   * @param id exact viewable match
   * @param kind canonical document kind
   * @return validated PDF bytes, without persistence
   * @throws SportingResourceNotFoundException for a missing or currently ineligible reference
   */
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public byte[] read(UUID id, MatchDocumentKindEnum kind) {
    Reference reference = reads.execute(status -> currentReference(id, kind));
    return source.fetch(reference);
  }

  /**
   * Applies the download eligibility rules to facts already admitted in the match detail read.
   *
   * @param details accepted detail of the viewable match
   * @param provider current provider of its pool
   * @return only backend subresources, with no provider locator
   */
  List<ConsultationViews.Document> actions(MatchDetails details, CollectionProviderEnum provider) {
    return eligibleKinds(details, provider).stream()
        .map(
            kind ->
                new ConsultationViews.Document(
                    kind, "/matches/" + details.id() + "/documents/" + kind.getValue()))
        .toList();
  }

  private Reference currentReference(UUID id, MatchDocumentKindEnum kind) {
    MatchView match = owners.publicMatch(id).orElseThrow(SportingResourceNotFoundException::new);
    PoolView pool = store.pool(match.poolId()).orElseThrow(SportingResourceNotFoundException::new);
    MatchDetails details = store.matchDetails(id);
    if (!eligibleKinds(details, pool.key().provider()).contains(kind)) {
      throw new SportingResourceNotFoundException();
    }
    return switch (kind) {
      case INFORMATION -> new Reference(null, details.informationSheet());
      case SCORESHEET -> new Reference(URI.create(details.scoresheetUrl()), null);
      case STATISTICS -> new Reference(URI.create(details.statisticsUrl()), null);
    };
  }

  /** Keeps contract order and uses accepted finality for result documents. */
  private static EnumSet<MatchDocumentKindEnum> eligibleKinds(
      MatchDetails details, CollectionProviderEnum provider) {
    EnumSet<MatchDocumentKindEnum> kinds = EnumSet.noneOf(MatchDocumentKindEnum.class);
    if (details.informationSheet() != null) {
      kinds.add(MatchDocumentKindEnum.INFORMATION);
    }
    if (Result.isFinal(details.result())) {
      if (details.scoresheetUrl() != null) {
        kinds.add(MatchDocumentKindEnum.SCORESHEET);
      }
      if (provider == CollectionProviderEnum.LNV && details.statisticsUrl() != null) {
        kinds.add(MatchDocumentKindEnum.STATISTICS);
      }
    }
    return kinds;
  }
}
