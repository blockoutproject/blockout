package com.blockout.notifications.followers.inbound;

import com.blockout.events.v2.model.PoolFollowedV2Event;
import com.blockout.events.v2.model.PoolUnfollowedV2Event;
import com.blockout.events.v2.model.TeamFollowedV2Event;
import com.blockout.events.v2.model.TeamUnfollowedV2Event;
import com.blockout.notifications.events.inbound.V2EventMetadataValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.springframework.amqp.core.Message;
import org.springframework.stereotype.Component;

/** Selects a generated favorite record from the stable AMQP type property, never from __TypeId__. */
@Component
public class FavoriteV2MessageDecoder {

    private final ObjectMapper objectMapper;
    private final FavoriteEventContractMapper mapper;
    private final V2EventMetadataValidator metadataValidator;

    FavoriteV2MessageDecoder(
            ObjectMapper objectMapper,
            FavoriteEventContractMapper mapper,
            V2EventMetadataValidator metadataValidator) {
        this.objectMapper = objectMapper;
        this.mapper = mapper;
        this.metadataValidator = metadataValidator;
    }

    public DecodedFavoriteEvent decodeTeam(Message message) {
        return switch (requiredType(message)) {
            case "TEAM_FOLLOWED" -> teamFollowed(message);
            case "TEAM_UNFOLLOWED" -> teamUnfollowed(message);
            default -> throw new IllegalArgumentException("Unexpected team favorite AMQP type");
        };
    }

    public DecodedFavoriteEvent decodePool(Message message) {
        return switch (requiredType(message)) {
            case "POOL_FOLLOWED" -> poolFollowed(message);
            case "POOL_UNFOLLOWED" -> poolUnfollowed(message);
            default -> throw new IllegalArgumentException("Unexpected pool favorite AMQP type");
        };
    }

    private DecodedFavoriteEvent teamFollowed(Message message) {
        TeamFollowedV2Event event = read(message, TeamFollowedV2Event.class);
        return decoded(message, event.eventId(), event.eventType().name(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId(),
                mapper.fromTeamFollowed(event));
    }

    private DecodedFavoriteEvent teamUnfollowed(Message message) {
        TeamUnfollowedV2Event event = read(message, TeamUnfollowedV2Event.class);
        return decoded(message, event.eventId(), event.eventType().name(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId(),
                mapper.fromTeamUnfollowed(event));
    }

    private DecodedFavoriteEvent poolFollowed(Message message) {
        PoolFollowedV2Event event = read(message, PoolFollowedV2Event.class);
        return decoded(message, event.eventId(), event.eventType().name(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId(),
                mapper.fromPoolFollowed(event));
    }

    private DecodedFavoriteEvent poolUnfollowed(Message message) {
        PoolUnfollowedV2Event event = read(message, PoolUnfollowedV2Event.class);
        return decoded(message, event.eventId(), event.eventType().name(), event.occurredAt(), event.producer(),
                event.schemaVersion(), event.orderingKey(), event.aggregateVersion(), event.correlationId(),
                mapper.fromPoolUnfollowed(event));
    }

    private String requiredType(Message message) {
        String type = message.getMessageProperties().getType();
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("Missing v2 AMQP type");
        }
        return type;
    }

    private <T> T read(Message message, Class<T> recordType) {
        try {
            return objectMapper.readValue(message.getBody(), recordType);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Invalid canonical favorite event JSON", exception);
        }
    }

    private DecodedFavoriteEvent decoded(
            Message message,
            java.util.UUID eventId,
            String eventType,
            java.time.OffsetDateTime occurredAt,
            String producer,
            String schemaVersion,
            String orderingKey,
            Long aggregateVersion,
            String correlationId,
            com.blockout.notifications.followers.application.FollowerProjectionCommand command) {
        String eventIdHeader = metadataValidator.validate(
                message.getMessageProperties(), eventId, eventType, occurredAt, producer, schemaVersion,
                orderingKey, aggregateVersion, correlationId);
        return new DecodedFavoriteEvent(eventId, eventIdHeader, eventType, command);
    }
}
