package com.blockout.clubs.listeners;

import com.blockout.events.v2.model.ClubDeactivationV2Event;
import com.blockout.events.v2.model.EventType;
import com.blockout.outbox.V2EventMetadataValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.springframework.amqp.core.Message;
import org.springframework.stereotype.Component;

/** Explicitly decodes the generated club deactivation record without Spring type metadata. */
@Component
public class ClubLifecycleV2MessageDecoder {

    private static final String VERSION = "2.0.0";
    private final ObjectMapper objectMapper;
    private final V2EventMetadataValidator metadataValidator;

    ClubLifecycleV2MessageDecoder(ObjectMapper objectMapper, V2EventMetadataValidator metadataValidator) {
        this.objectMapper = objectMapper;
        this.metadataValidator = metadataValidator;
    }

    ClubDeactivationV2Event decode(Message message) {
        if (message.getMessageProperties().getHeaders().containsKey("__TypeId__")) {
            throw new IllegalArgumentException("V2 event must not contain __TypeId__");
        }
        ClubDeactivationV2Event event = read(message);
        if (event.payload() == null || event.payload().clubId() == null
                || event.eventType() != EventType.CLUB_DEACTIVATED
                || !"competition-service".equals(event.producer())
                || !VERSION.equals(event.schemaVersion())
                || !("club:" + event.payload().clubId()).equals(event.orderingKey())) {
            throw new IllegalArgumentException("Canonical club deactivation event does not match its queue contract");
        }
        metadataValidator.validate(
                message.getMessageProperties(), event.eventId(), event.eventType().name(), event.occurredAt(),
                event.producer(), event.schemaVersion(), event.orderingKey(), event.aggregateVersion(),
                event.correlationId());
        return event;
    }

    private ClubDeactivationV2Event read(Message message) {
        try {
            return objectMapper.readValue(message.getBody(), ClubDeactivationV2Event.class);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Invalid canonical club deactivation event JSON", exception);
        }
    }
}
