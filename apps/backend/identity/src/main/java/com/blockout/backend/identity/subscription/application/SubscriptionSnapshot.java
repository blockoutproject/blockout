package com.blockout.backend.identity.subscription.application;

import com.blockout.backend.identity.subscription.domain.SubscriptionEvidence;
import java.time.Instant;
import java.util.UUID;

/**
 * Durable owner projection used for revision fencing and scheduling.
 *
 * @param binding exact provider identity
 * @param evidence last verified proof and latest failure
 * @param requestedRevision most recent durable request
 * @param processedRevision most recently acknowledged successful revision
 * @param jobId current queue identity, nullable when idle
 * @param requestedAt last effective user request, nullable
 * @param nextRefreshAt next periodic opportunity, nullable
 */
public record SubscriptionSnapshot(
    BillingBinding binding,
    SubscriptionEvidence evidence,
    long requestedRevision,
    long processedRevision,
    UUID jobId,
    Instant requestedAt,
    Instant nextRefreshAt) {}
