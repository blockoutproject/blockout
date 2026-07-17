package com.blockout.matches.match.application;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** Metadata created once by the future matches outbox and shared across route versions. */
public record MatchEventMetadata(UUID eventId, OffsetDateTime occurredAt, String correlationId) {

    public MatchEventMetadata {
        Objects.requireNonNull(eventId, "eventId is required");
        Objects.requireNonNull(occurredAt, "occurredAt is required");
        if (correlationId != null && correlationId.isBlank()) {
            throw new IllegalArgumentException("correlationId must be null or non-blank");
        }
    }
}
