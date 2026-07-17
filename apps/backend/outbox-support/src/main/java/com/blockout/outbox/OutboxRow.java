package com.blockout.outbox;

import java.time.Instant;
import java.util.UUID;

record OutboxRow(
        UUID eventId,
        String eventType,
        String schemaVersion,
        String producer,
        String orderingKey,
        Long aggregateVersion,
        String correlationId,
        Instant occurredAt,
        String exchange,
        String v1RoutingKey,
        String v1Payload,
        String v1PayloadType,
        Instant v1PublishedAt,
        boolean v2Enabled,
        String v2RoutingKey,
        String v2Payload,
        Instant v2PublishedAt,
        int attemptCount) {
}
