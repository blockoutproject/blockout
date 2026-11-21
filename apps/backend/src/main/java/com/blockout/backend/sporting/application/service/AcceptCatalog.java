package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleAccess;
import com.blockout.backend.collection.application.service.CollectionCycleAccess.AdmittedScope;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Atomic contextual discovery under the existing runtime/season locks; no calendar writes. */
@Service
@RequiredArgsConstructor
public class AcceptCatalog {
  private final CollectionCycleAccess cycleAccess;
  private final SportingStore store;

  /**
   * Validates every compound identity before changing the source-season catalog.
   *
   * @param sourceId exact admitted source-season binding
   * @param observation complete or partial discovery with safe qualified references
   * @return one positional outcome per submitted element, including duplicates
   */
  @Transactional
  public ObservationOutcome.Catalog accept(UUID sourceId, CatalogObservation observation) {
    AdmittedScope<CollectionState.Source> admission =
        cycleAccess.requireCatalogSource(observation.context().cycleId(), sourceId);
    CollectionState.Source source = admission.scope();
    CollectionState.Cycle cycle = admission.cycle();
    ObservationOrder order = observation.context().order(cycle.cycleOrder());
    Map<PoolKey, CatalogObservation.Pool> unique = new LinkedHashMap<>();
    for (CatalogObservation.Pool candidate : observation.pools()) {
      if (source.provider() == CollectionProviderEnum.LNV
          && (!source.organizerReference().equals(candidate.competitionReference())
              || !source.organizerReference().equals(candidate.packReference()))) {
        throw new SportingConflictException("identity-conflict", List.of());
      }
      PoolKey key = key(source, candidate);
      CatalogObservation.Pool previous = unique.putIfAbsent(key, candidate);
      if (previous != null && !previous.equals(candidate)) {
        throw new SportingConflictException("identity-conflict", List.of());
      }
    }
    ObservationOrder previous = store.catalogOrder(sourceId);
    int precedence = previous == null ? 1 : order.compareTo(previous);
    if (precedence < 0) {
      return new ObservationOutcome.Catalog(
          observation.pools().stream()
              .map(pool -> ObservationOutcome.refused(pool.poolReference(), true))
              .toList(),
          false);
    }
    boolean reconcile =
        precedence > 0
            && observation.complete()
            && !(observation.pools().isEmpty()
                && cycle.mode() == CollectionModeEnum.INITIAL_IMPORT);
    Map<CatalogObservation.Pool, ObservationOutcome> outcomes = new HashMap<>();
    for (Map.Entry<PoolKey, CatalogObservation.Pool> entry : unique.entrySet()) {
      CatalogObservation.Pool candidate = entry.getValue();
      UUID id =
          reconcile
              ? store.acceptCatalogPool(entry.getKey(), candidate)
              : store.pool(entry.getKey()).map(pool -> pool.id()).orElse(null);
      outcomes.put(
          candidate,
          id == null
              ? ObservationOutcome.refused(candidate.poolReference(), false)
              : new ObservationOutcome(
                  candidate.poolReference(),
                  reconcile ? ObservationOutcomeEnum.ACCEPTED : ObservationOutcomeEnum.UNCHANGED,
                  id,
                  null,
                  null,
                  null));
    }
    if (precedence > 0) {
      Set<UUID> presentIds =
          reconcile
              ? outcomes.values().stream()
                  .map(ObservationOutcome::resourceId)
                  .collect(Collectors.toSet())
              : Set.of();
      store.finishCatalog(
          sourceId,
          source.seasonId(),
          source.provider(),
          source.organizerReference(),
          presentIds,
          reconcile,
          order,
          observation.context());
    }
    return new ObservationOutcome.Catalog(
        observation.pools().stream().map(outcomes::get).toList(), reconcile);
  }

  /**
   * Builds identity exclusively within the backend-authorized source and canonical season.
   *
   * @param source authorized binding
   * @param pool native contextual reference
   * @return compound key without guessed tour/group components
   */
  private PoolKey key(CollectionState.Source source, CatalogObservation.Pool pool) {
    return new PoolKey(
        source.provider(),
        source.seasonId(),
        source.organizerReference(),
        pool.competitionReference(),
        pool.tourReference(),
        pool.groupReference(),
        pool.poolReference());
  }
}
