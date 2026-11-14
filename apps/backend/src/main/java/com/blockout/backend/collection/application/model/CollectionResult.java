package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;

/**
 * Current operator projection and latest usable success for one stable scope/stage/phase,
 * independent of dated diagnostic logs.
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
    URI reasonType,
    String reason,
    Long obtainedCount,
    Long rejectedCount) {}
