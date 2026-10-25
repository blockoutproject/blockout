package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Checks current effective acquisition classification against its frozen admission snapshot. */
@Service
@RequiredArgsConstructor
public class CheckAcquisitionClassification {
  private final SportingStore store;

  /**
   * Checks current acquisition classification against the admitted snapshot without restoring it.
   *
   * @param poolId existing pool
   * @param target backend-frozen acquisition classification
   * @return whether this observation remains compatible with current manual settings
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public boolean acceptsObservation(UUID poolId, CollectionState.Target target) {
    SportingViews.PoolClassificationView classification =
        store.poolClassification(poolId).orElseThrow();
    SportingClassification current =
        classification.setting() == null
            ? store.pack(classification.pool().packId()).orElseThrow().setting()
            : classification.setting();
    SportingClassification admitted =
        new SportingClassification(target.divisionId(), target.format(), target.gender());
    return current != null
        && current.equals(admitted)
        && (classification.pool().classification() == null
            || current.equals(classification.pool().classification()));
  }
}
