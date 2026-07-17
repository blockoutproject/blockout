package com.blockout.competitions.services;

import com.blockout.competitions.config.RabbitMQConfig;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleEvents;
import com.blockout.competitions.models.events.ClubDeactivationEvent;
import com.blockout.competitions.models.events.PoolDeactivationEvent;
import com.blockout.competitions.models.events.TeamDeactivationByPoolEvent;
import com.blockout.competitions.models.events.TeamDeactivationEvent;
import com.blockout.events.v2.model.ClubDeactivationV2Event;
import com.blockout.events.v2.model.ClubDeactivationV2Payload;
import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolDeactivationV2Event;
import com.blockout.events.v2.model.PoolDeactivationV2Payload;
import com.blockout.events.v2.model.TeamDeactivationV2Event;
import com.blockout.events.v2.model.TeamDeactivationV2Payload;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Records lifecycle facts atomically; the orphan team-by-pool route remains v1-only. */
@Service
@RequiredArgsConstructor
public class EventPublisher implements CompetitionLifecycleEvents {

    private static final String PRODUCER = "competition-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;

    @Override
    public void publishTeamDeactivation(Long teamId) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = TeamDeactivationEvent.builder().teamId(teamId).build();
        var canonical = new TeamDeactivationV2Event(
                null, metadata.correlationId(), metadata.eventId(), EventType.TEAM_DEACTIVATED,
                metadata.occurredAt(), "team:" + teamId, new TeamDeactivationV2Payload(teamId), PRODUCER, VERSION);
        record(metadata, EventType.TEAM_DEACTIVATED, "team:" + teamId,
                "team.deactivation", legacy, "team.deactivation.v2", canonical);
    }

    @Override
    public void publishPoolDeactivation(Long poolId) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = PoolDeactivationEvent.builder().poolId(poolId).build();
        var canonical = new PoolDeactivationV2Event(
                null, metadata.correlationId(), metadata.eventId(), EventType.POOL_DEACTIVATED,
                metadata.occurredAt(), "pool:" + poolId, new PoolDeactivationV2Payload(poolId), PRODUCER, VERSION);
        record(metadata, EventType.POOL_DEACTIVATED, "pool:" + poolId,
                "pool.deactivation", legacy, "pool.deactivation.v2", canonical);
    }

    @Override
    public void publishTeamDeactivationByPool(Long teamId, Long poolId) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = TeamDeactivationByPoolEvent.builder().teamId(teamId).poolId(poolId).build();
        outbox.record(new OutboxEvent(
                metadata, "TEAM_DEACTIVATED_BY_POOL_V1_ONLY", VERSION, PRODUCER,
                "pool:%d:team:%d".formatted(poolId, teamId), null, RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "teambypool.deactivation", legacy, null, null));
    }

    @Override
    public void publishClubDeactivation(String clubId) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = ClubDeactivationEvent.builder().clubId(clubId).build();
        var canonical = new ClubDeactivationV2Event(
                null, metadata.correlationId(), metadata.eventId(), EventType.CLUB_DEACTIVATED,
                metadata.occurredAt(), "club:" + clubId, new ClubDeactivationV2Payload(clubId), PRODUCER, VERSION);
        record(metadata, EventType.CLUB_DEACTIVATED, "club:" + clubId,
                "club.deactivation", legacy, "club.deactivation.v2", canonical);
    }

    private void record(
            OutboxMetadata metadata,
            EventType eventType,
            String orderingKey,
            String v1Route,
            Object v1Payload,
            String v2Route,
            Object v2Payload) {
        outbox.record(new OutboxEvent(
                metadata, eventType.getValue(), VERSION, PRODUCER, orderingKey, null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, v1Route, v1Payload, v2Route, v2Payload));
    }
}
