package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Establishes the one canonical season reused by F01; it never infers lifecycle from a match. */
@Service
public class SeasonService {
  private final SportingStore store;

  /**
   * Injects the canonical identity persistence owner.
   *
   * @param store owner-controlled persistence
   */
  public SeasonService(SportingStore store) {
    this.store = store;
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
