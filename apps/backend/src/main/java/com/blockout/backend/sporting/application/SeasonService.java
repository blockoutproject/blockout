package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Establishes the one canonical season reused by F01; it never infers lifecycle from a match. */
@Service
@RequiredArgsConstructor
public class SeasonService {
  private final SportingStore store;

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

  /**
   * Locks the same canonical season used by classification and future terminal closure.
   *
   * @param id canonical season identity; caller has already acquired its runtime fence
   * @return current lifecycle held through the caller transaction
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public SportingViews.CollectionSeasonView lockCollectionState(UUID id) {
    store.lockSeason(id);
    return collectionState(id);
  }

  /**
   * Reuses an explicitly qualified sporting year; concurrent creation is protected by uniqueness.
   *
   * @param startYear qualified year within the source contract's safe-integer range
   * @return canonical identity, without reopening or changing acquisition lifecycle
   */
  @Transactional
  public SeasonView getOrCreate(long startYear) {
    return store
        .seasonByYear(startYear)
        .orElseGet(() -> store.createSeason(startYear, startYear + "/" + (startYear + 1)));
  }
}
