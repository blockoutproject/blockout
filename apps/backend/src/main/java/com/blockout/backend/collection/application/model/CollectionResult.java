package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;

/** Current evidence for a stable scope/stage/phase, retaining its own recovery history only. */
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
    URI reasonType,
    String reason,
    Long obtainedCount,
    Long rejectedCount) {}
