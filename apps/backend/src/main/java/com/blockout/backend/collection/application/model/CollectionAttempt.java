package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.time.Instant;
import java.util.UUID;

/**
 * Current actual acquisition evidence for due selection, including its original logical token.
 * Admission itself is never an attempt; a failed token cannot override newer accepted F02 state.
 */
public record CollectionAttempt(
    UUID scopeId,
    CollectionStageEnum stage,
    Instant lastAttemptAt,
    Instant lastSuccessAt,
    CollectionOutcomeEnum outcome,
    long cycleOrder,
    long readOrdinal) {}
