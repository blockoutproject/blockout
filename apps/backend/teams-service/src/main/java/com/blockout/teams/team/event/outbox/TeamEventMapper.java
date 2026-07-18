package com.blockout.teams.team.event.outbox;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.events.v2.model.TeamUpsertV2Payload;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;
import com.blockout.teams.models.events.TeamUpsertEvent;
import com.blockout.teams.team.application.TeamUpsertFact;
import org.springframework.stereotype.Component;

@Component
class TeamEventMapper {

    TeamEventMessages map(TeamUpsertFact team, OutboxMetadata metadata) {
        var legacy = TeamUpsertEvent.builder()
                .id(team.id())
                .name(team.name())
                .shortName(team.shortName())
                .clubId(team.clubId())
                .divisionId(team.divisionId())
                .format(Format.valueOf(team.format().name()))
                .gender(Gender.valueOf(team.gender().name()))
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
}
