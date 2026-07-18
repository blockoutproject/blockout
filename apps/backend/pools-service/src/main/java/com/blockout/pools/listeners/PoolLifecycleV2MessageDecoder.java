package com.blockout.pools.listeners;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolDeactivationV2Event;
import com.blockout.outbox.V2EventMetadataValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.springframework.amqp.core.Message;
import org.springframework.stereotype.Component;

/** Explicitly decodes the generated pool deactivation record without Spring type metadata. */
@Component
public class PoolLifecycleV2MessageDecoder {

    private static final String VERSION = "2.0.0";
    private final ObjectMapper objectMapper;
    private final V2EventMetadataValidator metadataValidator;

    PoolLifecycleV2MessageDecoder(ObjectMapper objectMapper, V2EventMetadataValidator metadataValidator) {
        this.objectMapper = objectMapper;
        this.metadataValidator = metadataValidator;
    }

    PoolDeactivationV2Event decode(Message message) {
        if (message.getMessageProperties().getHeaders().containsKey("__TypeId__")) {
            throw new IllegalArgumentException("V2 event must not contain __TypeId__");
        }
        PoolDeactivationV2Event event = read(message);
        if (event.payload() == null
                || event.eventType() != EventType.POOL_DEACTIVATED
                || !"competition-service".equals(event.producer())
                || !VERSION.equals(event.schemaVersion())
                || !("pool:" + event.payload().poolId()).equals(event.orderingKey())) {
            throw new IllegalArgumentException("Canonical pool deactivation event does not match its queue contract");
        }
        metadataValidator.validate(
                message.getMessageProperties(), event.eventId(), event.eventType().name(), event.occurredAt(),
                event.producer(), event.schemaVersion(), event.orderingKey(), event.aggregateVersion(),
                event.correlationId());
        return event;
    }

    private PoolDeactivationV2Event read(Message message) {
        try {
            return objectMapper.readValue(message.getBody(), PoolDeactivationV2Event.class);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Invalid canonical pool deactivation event JSON", exception);
        }
    }
}
