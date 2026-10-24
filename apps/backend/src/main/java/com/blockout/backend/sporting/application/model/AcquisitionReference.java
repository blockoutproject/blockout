package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.time.Instant;
import java.util.UUID;

/**
 * F02-owned qualified seasonal competition reference; clubs use their own seasonless read context.
 */
public record AcquisitionReference(
    UUID scopeId,
    CollectionTargetKindEnum kind,
    PoolKey poolKey,
    String packReference,
    UUID poolId,
    UUID matchId,
    SportingClassification classification,
    String url,
    Instant fastWindowEndsAt,
    CollectionProviderEnum provider,
    String nativeMatchReference) {}
