package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.port.CollectionStore;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registers one startup after prior runtime-fenced transactions finish; dependent fencing has its
 * own boundary.
 */
@Service
@RequiredArgsConstructor
public class RegisterCollectorRuntime {
  private final CollectionStore store;

  /**
   * Replaces the current incarnation after all shared-lock holders finish; current repetition is a
   * no-op.
   *
   * @param revision revision read before startup registration
   * @param incarnationId UUID allocated once by this process startup
   * @return current registration and managed revision
   * @throws CollectionConflictException for stale replacement or exhausted safe revisions
   */
  @Transactional
  public CollectionState.Runtime register(long revision, UUID incarnationId) {
    Objects.requireNonNull(incarnationId);
    CollectionState.Runtime current = store.lockRuntimeForReplacement();
    if (incarnationId.equals(current.incarnationId())) return current;
    CollectionRevision.requireRevision(revision, current.revision());
    CollectionRevision.requireAdvance(current.revision());
    return store.replaceRuntime(incarnationId);
  }
}
