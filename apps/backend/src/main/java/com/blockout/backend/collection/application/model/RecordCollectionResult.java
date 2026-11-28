package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;

/** One attributable attempt; absent counts mean unmeasured, independently of its outcome. */
public record RecordCollectionResult(
    UUID scopeId,
    CollectionStageEnum stage,
    CollectionPhaseEnum phase,
    long readOrdinal,
    Instant observedAt,
    CollectionOutcomeEnum outcome,
    URI reasonType,
    String reason,
    Long obtainedCount,
    Long rejectedCount) {}
