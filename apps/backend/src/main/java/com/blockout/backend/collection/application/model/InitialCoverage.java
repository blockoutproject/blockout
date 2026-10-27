package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.util.List;
import java.util.UUID;

/** Current initial-import evidence, retained independently of ordinary operational results. */
public record InitialCoverage(
    UUID sourceBindingId,
    UUID scopeId,
    CollectionStageEnum stage,
    CollectionPhaseEnum phase,
    Status status,
    UUID cycleId,
    long cycleOrder,
    long readOrdinal,
    Long obtainedCount,
    Long rejectedCount) {
  /** Finite evidence states; obtained observations do not certify exhaustive provider coverage. */
  public enum Status {
    REQUESTED,
    OBTAINED,
    REJECTED,
    UNAVAILABLE
  }

  /** Bounded report page in stable source/scope/stage/phase order, without a total-count query. */
  public record Page(List<InitialCoverage> items, int page, boolean hasNext) {
    /** Detaches current evidence from persistence. */
    public Page {
      items = List.copyOf(items);
    }
  }
}
