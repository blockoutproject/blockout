package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Establishes the one canonical season reused by F01; it never infers lifecycle from a match. */
@Service
@RequiredArgsConstructor
public class SeasonService {
  private final SportingStore store;

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
