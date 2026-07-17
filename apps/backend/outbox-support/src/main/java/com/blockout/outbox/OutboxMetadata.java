package com.blockout.outbox;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OutboxMetadata(UUID eventId, OffsetDateTime occurredAt, String correlationId) {
}
