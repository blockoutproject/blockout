package com.blockout.teams.team.event.outbox;

import com.blockout.events.v2.model.EventType;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.team.application.TeamEventPublisher;
import com.blockout.teams.team.application.TeamUpsertFact;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Records both team wire versions atomically; Rabbit publication is owned by the outbox job. */
@Component
@RequiredArgsConstructor
public class OutboxTeamEventPublisher implements TeamEventPublisher {

    static final String PRODUCER = "teams-service";
    static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final TeamEventMapper mapper;

    @Override
    public void publishUpsert(TeamUpsertFact team) {
        OutboxMetadata metadata = outbox.newMetadata();
        TeamEventMessages messages = mapper.map(team, metadata);
        outbox.record(new OutboxEvent(
                metadata,
                EventType.TEAM_UPSERT.getValue(),
                VERSION,
                PRODUCER,
                "team:" + team.id(),
                null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "team.upsert",
                messages.legacy(),
                "team.upsert.v2",
                messages.canonical()));
    }
}
