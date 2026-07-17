package com.blockout.outbox;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

interface OutboxStore {

    void insert(OutboxEvent event, String v1Json, String v2Json);

    List<OutboxRow> claimReady(Instant now, int batchSize);

    void markV1Published(UUID eventId, Instant publishedAt);

    void markV2Published(UUID eventId, Instant publishedAt);

    void markFailure(UUID eventId, int attemptCount, Instant nextAttemptAt, String error);

    long countPending();

    int deleteCompletedBefore(Instant cutoff);
}
