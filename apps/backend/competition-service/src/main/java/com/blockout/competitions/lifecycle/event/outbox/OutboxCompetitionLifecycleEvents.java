package com.blockout.competitions.lifecycle.event.outbox;

import com.blockout.competitions.config.RabbitMQConfig;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleEvents;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Records lifecycle facts atomically; the orphan team-by-pool route remains v1-only. */
@Component
@RequiredArgsConstructor
public class OutboxCompetitionLifecycleEvents implements CompetitionLifecycleEvents {

    static final String PRODUCER = "competition-service";
    static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final CompetitionLifecycleEventMapper mapper;

    @Override
    public void publishTeamDeactivation(Long teamId) {
        OutboxMetadata metadata = outbox.newMetadata();
        record(metadata, mapper.team(teamId, metadata));
    }

    @Override
    public void publishPoolDeactivation(Long poolId) {
        OutboxMetadata metadata = outbox.newMetadata();
        record(metadata, mapper.pool(poolId, metadata));
    }

    @Override
    public void publishTeamDeactivationByPool(Long teamId, Long poolId) {
        record(outbox.newMetadata(), mapper.teamByPool(teamId, poolId));
    }

    @Override
    public void publishClubDeactivation(String clubId) {
        OutboxMetadata metadata = outbox.newMetadata();
        record(metadata, mapper.club(clubId, metadata));
    }

    private void record(OutboxMetadata metadata, CompetitionLifecycleEventMessages messages) {
        outbox.record(new OutboxEvent(
                metadata,
                messages.eventType(),
                VERSION,
                PRODUCER,
                messages.orderingKey(),
                null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                messages.v1Route(),
                messages.legacy(),
                messages.v2Route(),
                messages.canonical()));
    }
}
