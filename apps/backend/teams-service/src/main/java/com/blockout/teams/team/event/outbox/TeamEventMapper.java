package com.blockout.teams.team.event.outbox;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.TeamProjectionChangedV2Event;
import com.blockout.events.v2.model.TeamProjectionChangedV2Payload;
import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.events.v2.model.TeamUpsertV2Payload;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.models.events.TeamUpsertEvent;
import com.blockout.teams.team.application.TeamEventData;
import org.springframework.stereotype.Component;

@Component
class TeamEventMapper {

    TeamEventMessages map(TeamEventData team, OutboxMetadata metadata) {
        var legacy = TeamUpsertEvent.builder()
                .id(team.id())
                .name(team.name())
                .shortName(team.shortName())
                .clubId(team.clubId())
                .divisionId(team.divisionId())
                .format(FormatEnum.valueOf(team.format().name()))
                .gender(GenderEnum.valueOf(team.gender().name()))
                .season(team.season())
                .logoUrl(team.logoUrl())
                .build();
        var canonical = new TeamUpsertV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.TEAM_UPSERT,
                metadata.occurredAt(),
                "team:" + team.id(),
                new TeamUpsertV2Payload(
                        team.clubId(), team.divisionId(), team.format().getValue(), team.gender().getValue(),
                        team.id(), team.logoUrl(), team.name(), team.season(), team.shortName()),
                OutboxTeamEventPublisher.PRODUCER,
                OutboxTeamEventPublisher.VERSION);
        return new TeamEventMessages(legacy, canonical);
    }

    TeamProjectionChangedV2Event mapProjection(TeamEventData team, OutboxMetadata metadata) {
        return new TeamProjectionChangedV2Event(
                team.revision(),
                metadata.correlationId(),
                metadata.eventId(),
                EventType.TEAM_PROJECTION_CHANGED,
                metadata.occurredAt(),
                "team:" + team.id(),
                new TeamProjectionChangedV2Payload(
                        team.id(), team.name(), team.shortName(), team.clubId(), team.divisionId(),
                        team.format().getValue(), team.gender().getValue(), team.season(), team.logoUrl(), team.active()),
                OutboxTeamEventPublisher.PRODUCER,
                OutboxTeamEventPublisher.VERSION);
    }
}
