package com.blockout.outbox;

import java.util.Objects;

/** One application fact and its independently tracked v1/v2 publications. */
public record OutboxEvent(
        OutboxMetadata metadata,
        String eventType,
        String schemaVersion,
        String producer,
        String orderingKey,
        Long aggregateVersion,
        String exchange,
        String v1RoutingKey,
        Object v1Payload,
        String v2RoutingKey,
        Object v2Payload) {

    public OutboxEvent {
        Objects.requireNonNull(metadata, "metadata is required");
        Objects.requireNonNull(metadata.eventId(), "eventId is required");
        Objects.requireNonNull(metadata.occurredAt(), "occurredAt is required");
        requireText(eventType, "eventType");
        requireText(schemaVersion, "schemaVersion");
        requireText(producer, "producer");
        requireText(orderingKey, "orderingKey");
        requireText(exchange, "exchange");
        requireText(v1RoutingKey, "v1RoutingKey");
        Objects.requireNonNull(v1Payload, "v1Payload is required");
        if ((v2RoutingKey == null) != (v2Payload == null)) {
            throw new IllegalArgumentException("v2 route and payload must both be present or absent");
        }
        if (aggregateVersion != null && aggregateVersion < 0) {
            throw new IllegalArgumentException("aggregateVersion must be null or non-negative");
        }
    }

    public boolean v2Enabled() {
        return v2RoutingKey != null;
    }

    private static void requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must be non-blank");
        }
    }
}
