package com.blockout.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Writes the event and both wire bodies inside the caller's business transaction. */
final class OutboxWriter implements OutboxRecorder {

    private final OutboxStore store;
    private final ObjectMapper legacyMapper;
    private final ObjectMapper canonicalMapper;
    private final Clock clock;

    OutboxWriter(OutboxStore store, ObjectMapper objectMapper, Clock clock) {
        this.store = store;
        this.legacyMapper = objectMapper;
        this.canonicalMapper = objectMapper.copy()
                .setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);
        this.clock = clock;
    }

    @Override
    public OutboxMetadata newMetadata() {
        return new OutboxMetadata(
                UUID.randomUUID(), OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC), null);
    }

    @Override
    public void record(OutboxEvent event) {
        try {
            String v1Json = legacyMapper.writeValueAsString(event.v1Payload());
            String v2Json = event.v2Enabled() ? canonicalMapper.writeValueAsString(event.v2Payload()) : null;
            store.insert(event, v1Json, v2Json);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to serialize outbox event " + event.eventType(), exception);
        }
    }
}
