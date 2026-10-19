package com.blockout.backend.collection.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.time.Instant;
import java.util.UUID;

/** Current actual acquisition evidence for due selection; admission itself is never an attempt. */
public record CollectionAttempt(
    UUID scopeId, CollectionStageEnum stage, Instant lastAttemptAt, Instant lastSuccessAt) {}
