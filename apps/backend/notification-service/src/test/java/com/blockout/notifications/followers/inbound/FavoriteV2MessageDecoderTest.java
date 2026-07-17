package com.blockout.notifications.followers.inbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolFollowV2Payload;
import com.blockout.events.v2.model.PoolUnfollowedV2Event;
import com.blockout.events.v2.model.TeamFollowV2Payload;
import com.blockout.events.v2.model.TeamFollowedV2Event;
import com.blockout.notifications.events.V2EventMetadataValidator;
import com.blockout.notifications.followers.application.FollowerProjectionAction;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

class FavoriteV2MessageDecoderTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final FavoriteV2MessageDecoder decoder = new FavoriteV2MessageDecoder(
            objectMapper, new FavoriteEventContractMapper(), new V2EventMetadataValidator());

    @Test
    void decodesBothQueueEventKindsWithoutATypeIdHeader() throws Exception {
        UUID teamId = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");
        UUID poolId = UUID.fromString("6df9b042-8fe7-4d7e-a5a2-5917f4419da0");
        OffsetDateTime occurredAt = OffsetDateTime.parse("2026-07-17T20:00Z");
        var team = new TeamFollowedV2Event(
                null, null, teamId, EventType.TEAM_FOLLOWED, occurredAt, "user:10:team:20",
                new TeamFollowV2Payload(20L, 10L), "users-service", "2.0.0");
        var pool = new PoolUnfollowedV2Event(
                null, null, poolId, EventType.POOL_UNFOLLOWED, occurredAt, "user:11:pool:21",
                new PoolFollowV2Payload(21L, 11L), "users-service", "2.0.0");

        DecodedFavoriteEvent decodedTeam = decoder.decodeTeam(message(team, teamId, occurredAt, "TEAM_FOLLOWED",
                "user:10:team:20"));
        DecodedFavoriteEvent decodedPool = decoder.decodePool(message(pool, poolId, occurredAt, "POOL_UNFOLLOWED",
                "user:11:pool:21"));

        assertThat(decodedTeam.command().action()).isEqualTo(FollowerProjectionAction.FOLLOW);
        assertThat(decodedTeam.command().entityId()).isEqualTo(20L);
        assertThat(decodedPool.command().action()).isEqualTo(FollowerProjectionAction.UNFOLLOW);
        assertThat(decodedPool.command().entityId()).isEqualTo(21L);
    }

    @Test
    void rejectsSpringTypeMetadata() throws Exception {
        UUID eventId = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");
        OffsetDateTime occurredAt = OffsetDateTime.parse("2026-07-17T20:00Z");
        var event = new TeamFollowedV2Event(
                null, null, eventId, EventType.TEAM_FOLLOWED, occurredAt, "user:10:team:20",
                new TeamFollowV2Payload(20L, 10L), "users-service", "2.0.0");
        Message message = message(event, eventId, occurredAt, "TEAM_FOLLOWED", "user:10:team:20");
        message.getMessageProperties().setHeader("__TypeId__", TeamFollowedV2Event.class.getName());

        assertThatThrownBy(() -> decoder.decodeTeam(message))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must not contain __TypeId__");
    }

    private Message message(Object event, UUID eventId, OffsetDateTime occurredAt, String type, String orderingKey)
            throws Exception {
        MessageProperties properties = new MessageProperties();
        properties.setMessageId(eventId.toString());
        properties.setType(type);
        properties.setTimestamp(Date.from(occurredAt.toInstant()));
        properties.setHeader("x-blockout-event-id", eventId.toString());
        properties.setHeader("x-blockout-schema-version", "2.0.0");
        properties.setHeader("x-blockout-producer", "users-service");
        properties.setHeader("x-blockout-ordering-key", orderingKey);
        return new Message(objectMapper.writeValueAsBytes(event), properties);
    }
}
