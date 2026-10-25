package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;

/** Admission and preparation eligibility of a canonical season; admitted completion is separate. */
@lombok.NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class CollectionLifecycle {

  /**
   * Refuses immutable closed history without claiming that an admitted cycle must stop.
   *
   * @param season current canonical season, absent for seasonless controls
   */
  static void requireOpen(CollectionSeasonView season) {
    if (season != null && season.collectionState() == CollectionSeasonStateEnum.CLOSED)
      throw new CollectionConflictException("conflict");
  }
}
