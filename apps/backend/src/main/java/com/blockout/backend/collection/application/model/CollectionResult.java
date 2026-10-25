package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;

/**
 * Current evidence for a stable scope/stage/phase. The first structural failure remains
 * attributable until a usable observation of this key; later transport failures cannot erase that
 * evidence.
 */
public record CollectionResult(
    UUID scopeId,
    CollectionStageEnum stage,
    CollectionPhaseEnum phase,
    long cycleOrder,
    long readOrdinal,
    Instant observedAt,
    CollectionOutcomeEnum outcome,
    Instant lastSuccessAt,
    Instant firstFailureAt,
    Instant firstStructuralFailureAt,
    URI reasonType,
    String reason,
    Long obtainedCount,
    Long rejectedCount) {}
