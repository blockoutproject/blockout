package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.sporting.application.MatchDocumentSource.Reference;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.net.URI;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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
    Reference reference =
        reads.execute(
            status -> {
              Reference current = references(id).get(kind);
              if (current == null) throw new SportingResourceNotFoundException();
              return current;
            });
    return source.fetch(reference);
  }

  /**
   * Shares the delivery rules with current match actions, joining the resource read transaction.
   *
   * @param id exact viewable match
   * @return only backend subresources, with no provider locator
   */
  public List<ConsultationViews.Document> actions(UUID id) {
    return reads.execute(
        status ->
            references(id).keySet().stream()
                .map(
                    kind ->
                        new ConsultationViews.Document(
                            kind, "/matches/" + id + "/documents/" + kind.getValue()))
                .toList());
  }

  /**
   * Reads current accepted references only; time classification never establishes finality.
   *
   * @param id exact current match identity inside the caller's read transaction
   * @return independently eligible locators, with absent references omitted
   */
  private Map<MatchDocumentKindEnum, Reference> references(UUID id) {
    MatchView match = owners.publicMatch(id).orElseThrow(SportingResourceNotFoundException::new);
    PoolView pool = store.pool(match.poolId()).orElseThrow(SportingResourceNotFoundException::new);
    MatchDetails details = store.matchDetails(id);
    Map<MatchDocumentKindEnum, Reference> result = new EnumMap<>(MatchDocumentKindEnum.class);
    if (details.informationSheet() != null)
      result.put(
          MatchDocumentKindEnum.INFORMATION, new Reference(null, details.informationSheet()));
    if (details.result() != null && details.result().state() == ResultStateEnum.FINAL) {
      if (details.scoresheetUrl() != null)
        result.put(
            MatchDocumentKindEnum.SCORESHEET,
            new Reference(URI.create(details.scoresheetUrl()), null));
      if (pool.key().provider() == CollectionProviderEnum.LNV && details.statisticsUrl() != null)
        result.put(
            MatchDocumentKindEnum.STATISTICS,
            new Reference(URI.create(details.statisticsUrl()), null));
    }
    return result;
  }
}
