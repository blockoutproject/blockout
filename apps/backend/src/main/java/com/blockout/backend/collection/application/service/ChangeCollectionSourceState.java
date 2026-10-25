package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Publishes a source revision together with its canonical season preparation revision. */
@Service
@RequiredArgsConstructor
public class ChangeCollectionSourceState {
  private final CollectionStore store;
  private final ChangeCollectionSeasons seasons;

  /**
   * Publishes one source mutation together with the season's preparation revision.
   *
   * @param source already authorized state change
   * @return flushed source revision
   */
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public Source save(Source source) {
    CollectionRevision.requireAdvance(source.revision());
    Source changed = store.saveSource(source);
    seasons.updatePreparation(source.seasonId(), false);
    return changed;
  }
}
