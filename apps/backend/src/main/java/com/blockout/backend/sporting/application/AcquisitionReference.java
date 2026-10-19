package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.time.Instant;
import java.util.UUID;

/** F02-owned qualified identity/reference for acquisition; personal locality is read separately. */
public record AcquisitionReference(
    UUID scopeId,
    CollectionTargetKindEnum kind,
    PoolKey poolKey,
    String packReference,
    UUID poolId,
    UUID matchId,
    UUID clubId,
    String clubReference,
    SportingClassification classification,
    String url,
    Instant fastWindowEndsAt,
    CollectionProviderEnum provider,
    String nativeMatchReference) {}
