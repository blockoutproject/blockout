package com.blockout.users.favorite.application;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** Metadata created once by the future users outbox and shared across route versions. */
public record FavoriteEventMetadata(UUID eventId, OffsetDateTime occurredAt, String correlationId) {

    public FavoriteEventMetadata {
        Objects.requireNonNull(eventId, "eventId is required");
        Objects.requireNonNull(occurredAt, "occurredAt is required");
        if (correlationId != null && correlationId.isBlank()) {
            throw new IllegalArgumentException("correlationId must be null or non-blank");
        }
    }
}
