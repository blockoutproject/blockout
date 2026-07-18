package com.blockout.notifications.events.inbound;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.stereotype.Component;

/** Validates that canonical body identity and MRG-315 AMQP metadata describe the same event. */
@Component
public class V2EventMetadataValidator {

    public String validate(
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
        String headerEventId = requiredHeader(properties, "x-blockout-event-id");
        requireEqual(eventId.toString(), headerEventId, "x-blockout-event-id");
        requireEqual(eventId.toString(), properties.getMessageId(), "messageId");
        requireEqual(eventType, properties.getType(), "type");
        requireEqual(schemaVersion, requiredHeader(properties, "x-blockout-schema-version"), "schemaVersion");
        requireEqual(producer, requiredHeader(properties, "x-blockout-producer"), "producer");
        requireEqual(orderingKey, requiredHeader(properties, "x-blockout-ordering-key"), "orderingKey");
        if (properties.getTimestamp() == null
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
            throw new IllegalArgumentException("aggregateVersion metadata mismatch");
        }
        return headerEventId;
    }

    private String requiredHeader(MessageProperties properties, String name) {
        Object value = properties.getHeaders().get(name);
        if (value == null) {
            throw new IllegalArgumentException("Missing required v2 header: " + name);
        }
        return value.toString();
    }

    private void requireEqual(String expected, String actual, String field) {
        if (!Objects.equals(expected, actual)) {
            throw new IllegalArgumentException("V2 " + field + " metadata mismatch");
        }
    }
}
