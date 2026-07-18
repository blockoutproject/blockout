package com.blockout.teams.team.event.inbound;

import com.blockout.events.v2.model.ClubDeactivationV2Event;
import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.TeamDeactivationV2Event;
import com.blockout.outbox.V2EventMetadataValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.springframework.amqp.core.Message;
import org.springframework.stereotype.Component;

/** Decodes generated competition-owner wire records into team-owned lifecycle facts. */
@Component
class TeamLifecycleV2MessageDecoder {

    private static final String VERSION = "2.0.0";
    private final ObjectMapper objectMapper;
    private final V2EventMetadataValidator metadataValidator;

    TeamLifecycleV2MessageDecoder(ObjectMapper objectMapper, V2EventMetadataValidator metadataValidator) {
        this.objectMapper = objectMapper;
        this.metadataValidator = metadataValidator;
    }

    TeamDeactivationFact decodeTeam(Message message) {
        var event = read(message, TeamDeactivationV2Event.class);
        if (event.payload() == null
                || event.eventType() != EventType.TEAM_DEACTIVATED
                || !"competition-service".equals(event.producer())
                || !VERSION.equals(event.schemaVersion())
                || !("team:" + event.payload().teamId()).equals(event.orderingKey())) {
            throw new IllegalArgumentException("Canonical team deactivation event does not match its queue contract");
        }
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        return new TeamDeactivationFact(event.eventId(), event.eventType().name(), event.payload().teamId());
    }

    ClubDeactivationFact decodeClub(Message message) {
        var event = read(message, ClubDeactivationV2Event.class);
        if (event.payload() == null || event.payload().clubId() == null
                || event.eventType() != EventType.CLUB_DEACTIVATED
                || !"competition-service".equals(event.producer())
                || !VERSION.equals(event.schemaVersion())
                || !("club:" + event.payload().clubId()).equals(event.orderingKey())) {
            throw new IllegalArgumentException("Canonical club deactivation event does not match its queue contract");
        }
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        return new ClubDeactivationFact(event.eventId(), event.eventType().name(), event.payload().clubId());
    }

    private <T> T read(Message message, Class<T> recordType) {
        if (message.getMessageProperties().getHeaders().containsKey("__TypeId__")) {
            throw new IllegalArgumentException("V2 event must not contain __TypeId__");
        }
        try {
            return objectMapper.readValue(message.getBody(), recordType);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Invalid canonical team-owner lifecycle event JSON", exception);
        }
    }

    private void validate(Message message, java.util.UUID eventId, EventType eventType,
            java.time.OffsetDateTime occurredAt, String producer, String schemaVersion, String orderingKey,
            Long aggregateVersion, String correlationId) {
        metadataValidator.validate(
                message.getMessageProperties(), eventId, eventType.name(), occurredAt, producer, schemaVersion,
                orderingKey, aggregateVersion, correlationId);
    }
}
