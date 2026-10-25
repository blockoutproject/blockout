package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.port.CollectionStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transaction-held runtime fence shared by admitted writes; never registers a replacement process.
 */
@Service
@RequiredArgsConstructor
public class CollectorRuntimeAccess {
  private final CollectionStore store;

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
}
