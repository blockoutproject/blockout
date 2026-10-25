package com.blockout.backend.sporting.application.service;

import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Canonical sporting-season lifecycle reads for collection consumers. */
@Service
@RequiredArgsConstructor
public class ReadCollectionSeasons {
  private final SportingStore store;

  /**
   * Lists the canonical season preparation states without provider discovery.
   *
   * @return complete configuration in newest-first order
   */
  @Transactional(readOnly = true)
  public List<SportingViews.CollectionSeasonView> collectionStates() {
    return store.collectionSeasons();
  }

  /**
   * Reads the current acquisition states required by one collection-configuration read.
   *
   * @param ids distinct canonical seasons; an empty selection returns no states
   * @return current states keyed by their requested canonical identities
   * @throws SportingResourceNotFoundException if a requested season no longer exists
   */
  @Transactional(readOnly = true)
  public Map<UUID, SportingViews.CollectionSeasonView> collectionStates(Set<UUID> ids) {
    Map<UUID, SportingViews.CollectionSeasonView> states = store.collectionSeasons(ids);
    if (!states.keySet().equals(ids)) throw new SportingResourceNotFoundException();
    return states;
  }

  /**
   * Reads the acquisition lifecycle of the canonical F02 season.
   *
   * @param id canonical season identity
   * @return current acquisition lifecycle, without any admission or mutation
   */
  @Transactional(readOnly = true)
  public SportingViews.CollectionSeasonView collectionState(UUID id) {
    return store.collectionSeason(id).orElseThrow(SportingResourceNotFoundException::new);
  }
}
