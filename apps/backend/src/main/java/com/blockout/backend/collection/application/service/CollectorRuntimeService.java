package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.port.CollectionStore;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Registers one startup per environment and fences every dependent domain transaction. */
@Service
@RequiredArgsConstructor
public class CollectorRuntimeService {
  static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
  private final CollectionStore store;

  /**
   * Reads the current environment registration.
   *
   * @return the current runtime without registering or admitting work
   */
  @Transactional(readOnly = true)
  public CollectionState.Runtime current() {
    return store.runtime();
  }

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
    if (revision != current.revision()) throw new CollectionConflictException("stale-revision");
    requireAdvance(current.revision());
    return store.replaceRuntime(incarnationId);
  }

  /**
   * Holds the shared runtime lock until the calling domain transaction commits or rolls back.
   *
   * @param incarnationId admitted startup; acquire this before season, sporting and account locks
   * @throws CollectionConflictException when this process has been superseded
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void requireCurrent(UUID incarnationId) {
    CollectionState.Runtime current = store.lockRuntime();
    if (incarnationId == null || !incarnationId.equals(current.incarnationId())) {
      throw new CollectionConflictException("invalid-cycle-context");
    }
  }

  /**
   * Rejects revisions that cannot advance within the shared safe range.
   *
   * @param revision current nonnegative wire revision
   */
  static void requireAdvance(long revision) {
    if (revision < 0 || revision >= MAX_SAFE_INTEGER)
      throw new CollectionConflictException("conflict");
  }
}
