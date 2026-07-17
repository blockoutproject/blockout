package com.blockout.teams.services;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.events.v2.model.TeamUpsertV2Payload;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;
import com.blockout.teams.models.events.TeamUpsertEvent;
import com.blockout.teams.team.application.TeamEventPublisher;
import com.blockout.teams.team.application.TeamView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Records both team wire versions atomically; Rabbit publication is owned by the outbox job. */
@Service
@RequiredArgsConstructor
public class EventPublisher implements TeamEventPublisher {

    private static final String PRODUCER = "teams-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;

    @Override
    public void publishUpsert(TeamView team) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = TeamUpsertEvent.builder()
                .id(team.id()).name(team.name()).shortName(team.shortName()).clubId(team.clubId())
                .divisionId(team.divisionId()).format(Format.valueOf(team.format().name()))
                .gender(Gender.valueOf(team.gender().name())).season(team.season()).logoUrl(team.logoUrl()).build();
        var canonical = new TeamUpsertV2Event(
                null, metadata.correlationId(), metadata.eventId(), EventType.TEAM_UPSERT, metadata.occurredAt(),
                "team:" + team.id(), new TeamUpsertV2Payload(
                        team.clubId(), team.divisionId(), team.format().getValue(), team.gender().getValue(), team.id(),
                        team.logoUrl(), team.name(), team.season(), team.shortName()), PRODUCER, VERSION);
        outbox.record(new OutboxEvent(
                metadata, EventType.TEAM_UPSERT.getValue(), VERSION, PRODUCER, "team:" + team.id(), null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "team.upsert", legacy, "team.upsert.v2", canonical));
    }
}
