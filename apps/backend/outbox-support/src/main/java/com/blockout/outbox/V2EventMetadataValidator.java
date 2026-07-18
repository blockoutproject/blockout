package com.blockout.outbox;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;
import org.springframework.amqp.core.MessageProperties;

/** Validates that canonical body identity and MRG-315 AMQP metadata describe the same event. */
public class V2EventMetadataValidator {

    public void validate(
            MessageProperties properties,
            UUID eventId,
            String eventType,
            OffsetDateTime occurredAt,
            String producer,
            String schemaVersion,
            String orderingKey,
            Long aggregateVersion,
            String correlationId) {
        if (properties.getHeaders().containsKey("__TypeId__")) {
            throw new IllegalArgumentException("V2 event must not contain __TypeId__");
        }
        requireEqual(required(eventId, "eventId").toString(), requiredHeader(properties, "x-blockout-event-id"),
                "x-blockout-event-id");
        requireEqual(eventId.toString(), properties.getMessageId(), "messageId");
        requireEqual(required(eventType, "eventType"), properties.getType(), "type");
        requireEqual(required(schemaVersion, "schemaVersion"),
                requiredHeader(properties, "x-blockout-schema-version"), "schemaVersion");
        requireEqual(required(producer, "producer"), requiredHeader(properties, "x-blockout-producer"), "producer");
        requireEqual(required(orderingKey, "orderingKey"),
                requiredHeader(properties, "x-blockout-ordering-key"), "orderingKey");
        if (occurredAt == null || properties.getTimestamp() == null
                || properties.getTimestamp().toInstant().toEpochMilli() != occurredAt.toInstant().toEpochMilli()) {
            throw new IllegalArgumentException("V2 timestamp does not match occurredAt");
        }
        requireEqual(correlationId, properties.getCorrelationId(), "correlationId");
        Object aggregateHeader = properties.getHeaders().get("x-blockout-aggregate-version");
        if (aggregateVersion == null && aggregateHeader != null) {
            throw new IllegalArgumentException("Unexpected x-blockout-aggregate-version");
        }
        if (aggregateVersion != null
                && (aggregateHeader == null || !aggregateVersion.toString().equals(aggregateHeader.toString()))) {
            throw new IllegalArgumentException("V2 aggregateVersion metadata mismatch");
        }
    }

    private String requiredHeader(MessageProperties properties, String name) {
        Object value = properties.getHeaders().get(name);
        if (value == null) {
            throw new IllegalArgumentException("Missing required v2 header: " + name);
        }
        return value.toString();
    }

    private <T> T required(T value, String field) {
        if (value == null) {
            throw new IllegalArgumentException("Missing required v2 body field: " + field);
        }
        return value;
    }

    private void requireEqual(String expected, String actual, String field) {
        if (!Objects.equals(expected, actual)) {
            throw new IllegalArgumentException("V2 " + field + " metadata mismatch");
        }
    }
}
