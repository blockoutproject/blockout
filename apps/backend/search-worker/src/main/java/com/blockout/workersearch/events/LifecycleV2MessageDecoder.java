package com.blockout.workersearch.events;

import com.blockout.events.v2.model.ClubDeactivationV2Event;
import com.blockout.events.v2.model.ClubUpsertV2Event;
import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolDeactivationV2Event;
import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.events.v2.model.TeamDeactivationV2Event;
import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.workersearch.models.events.ClubDeactivationEvent;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.PoolDeactivationEvent;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.models.events.TeamDeactivationEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.springframework.amqp.core.Message;
import org.springframework.stereotype.Component;

/** Explicitly decodes generated lifecycle records without Spring type metadata. */
@Component
public class LifecycleV2MessageDecoder {

    private static final String VERSION = "2.0.0";
    private final ObjectMapper objectMapper;
    private final V2EventMetadataValidator metadataValidator;

    public LifecycleV2MessageDecoder(ObjectMapper objectMapper, V2EventMetadataValidator metadataValidator) {
        this.objectMapper = objectMapper;
        this.metadataValidator = metadataValidator;
    }

    public DecodedLifecycleEvent<ClubUpsertEvent> clubUpsert(Message message) {
        var event = read(message, ClubUpsertV2Event.class);
        requireContract(event.eventType(), EventType.CLUB_UPSERT, event.producer(), "clubs-service",
                event.schemaVersion(), event.orderingKey(), "club:" + required(event.payload(), "payload").id());
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        var payload = event.payload();
        return decoded(event.eventId(), event.eventType(), ClubUpsertEvent.builder()
                .id(payload.id()).name(payload.name()).logoUrl(payload.logoUrl()).city(payload.city()).build());
    }

    public DecodedLifecycleEvent<TeamUpsertEvent> teamUpsert(Message message) {
        var event = read(message, TeamUpsertV2Event.class);
        requireContract(event.eventType(), EventType.TEAM_UPSERT, event.producer(), "teams-service",
                event.schemaVersion(), event.orderingKey(), "team:" + required(event.payload(), "payload").id());
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        var payload = event.payload();
        return decoded(event.eventId(), event.eventType(), TeamUpsertEvent.builder()
                .id(payload.id()).name(payload.name()).shortName(payload.shortName()).clubId(payload.clubId())
                .divisionId(payload.divisionId()).format(enumValue(FormatEnum.class, payload.format()))
                .gender(enumValue(GenderEnum.class, payload.gender())).season(payload.season()).logoUrl(payload.logoUrl())
                .build());
    }

    public DecodedLifecycleEvent<PoolUpsertEvent> poolUpsert(Message message) {
        var event = read(message, PoolUpsertV2Event.class);
        requireContract(event.eventType(), EventType.POOL_UPSERT, event.producer(), "pools-service",
                event.schemaVersion(), event.orderingKey(), "pool:" + required(event.payload(), "payload").id());
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        var payload = event.payload();
        return decoded(event.eventId(), event.eventType(), PoolUpsertEvent.builder()
                .id(payload.id()).name(payload.name()).shortName(payload.shortName()).divisionId(payload.divisionId())
                .leagueCode(payload.leagueCode()).leagueName(payload.leagueName()).season(payload.season())
                .format(enumValue(FormatEnum.class, payload.format())).gender(enumValue(GenderEnum.class, payload.gender()))
                .build());
    }

    public DecodedLifecycleEvent<ClubDeactivationEvent> clubDeactivation(Message message) {
        var event = read(message, ClubDeactivationV2Event.class);
        requireContract(event.eventType(), EventType.CLUB_DEACTIVATED, event.producer(), "competition-service",
                event.schemaVersion(), event.orderingKey(), "club:" + required(event.payload(), "payload").clubId());
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        return decoded(event.eventId(), event.eventType(),
                ClubDeactivationEvent.builder().clubId(event.payload().clubId()).build());
    }

    public DecodedLifecycleEvent<TeamDeactivationEvent> teamDeactivation(Message message) {
        var event = read(message, TeamDeactivationV2Event.class);
        requireContract(event.eventType(), EventType.TEAM_DEACTIVATED, event.producer(), "competition-service",
                event.schemaVersion(), event.orderingKey(), "team:" + required(event.payload(), "payload").teamId());
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        return decoded(event.eventId(), event.eventType(),
                TeamDeactivationEvent.builder().teamId(event.payload().teamId()).build());
    }

    public DecodedLifecycleEvent<PoolDeactivationEvent> poolDeactivation(Message message) {
        var event = read(message, PoolDeactivationV2Event.class);
        requireContract(event.eventType(), EventType.POOL_DEACTIVATED, event.producer(), "competition-service",
                event.schemaVersion(), event.orderingKey(), "pool:" + required(event.payload(), "payload").poolId());
        validate(message, event.eventId(), event.eventType(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId());
        return decoded(event.eventId(), event.eventType(),
                PoolDeactivationEvent.builder().poolId(event.payload().poolId()).build());
    }

    private <T> T read(Message message, Class<T> recordType) {
        if (message.getMessageProperties().getHeaders().containsKey("__TypeId__")) {
            throw new IllegalArgumentException("V2 event must not contain __TypeId__");
        }
        try {
            return objectMapper.readValue(message.getBody(), recordType);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Invalid canonical lifecycle event JSON", exception);
        }
    }

    private void validate(Message message, java.util.UUID eventId, EventType eventType,
            java.time.OffsetDateTime occurredAt, String producer, String schemaVersion, String orderingKey,
            Long aggregateVersion, String correlationId) {
        metadataValidator.validate(message.getMessageProperties(), eventId,
                eventType == null ? null : eventType.name(), occurredAt, producer, schemaVersion, orderingKey,
                aggregateVersion, correlationId);
    }

    private void requireContract(EventType actualType, EventType expectedType, String actualProducer,
            String expectedProducer, String schemaVersion, String actualOrderingKey, String expectedOrderingKey) {
        if (actualType != expectedType || !expectedProducer.equals(actualProducer) || !VERSION.equals(schemaVersion)
                || !expectedOrderingKey.equals(actualOrderingKey)) {
            throw new IllegalArgumentException("Canonical lifecycle event does not match its queue contract");
        }
    }

    private <T> DecodedLifecycleEvent<T> decoded(java.util.UUID eventId, EventType eventType, T projectionEvent) {
        return new DecodedLifecycleEvent<>(eventId, eventType.name(), projectionEvent);
    }

    private <T> T required(T value, String field) {
        if (value == null) {
            throw new IllegalArgumentException("Missing required v2 body field: " + field);
        }
        return value;
    }

    private <T extends Enum<T>> T enumValue(Class<T> type, String value) {
        return value == null ? null : Enum.valueOf(type, value);
    }
}
