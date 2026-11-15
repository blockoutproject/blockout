package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persists source state with the revision retained by collector protocols. */
@Service
@RequiredArgsConstructor
public class ChangeCollectionSourceState {
  private final CollectionStore store;

  /**
   * Persists one approved source mutation.
   *
   * @param source already authorized state change
   * @return flushed source revision
   */
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public Source save(Source source) {
    CollectionRevision.requireAdvance(source.revision());
    return store.saveSource(source);
  }
}
