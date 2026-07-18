package com.blockout.competitions.lifecycle.event.outbox;

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
import com.blockout.outbox.OutboxMetadata;
import org.springframework.stereotype.Component;

@Component
class CompetitionLifecycleEventMapper {

    CompetitionLifecycleEventMessages team(Long teamId, OutboxMetadata metadata) {
        return new CompetitionLifecycleEventMessages(
                EventType.TEAM_DEACTIVATED.getValue(),
                "team:" + teamId,
                "team.deactivation",
                TeamDeactivationEvent.builder().teamId(teamId).build(),
                "team.deactivation.v2",
                new TeamDeactivationV2Event(
                        null,
                        metadata.correlationId(),
                        metadata.eventId(),
                        EventType.TEAM_DEACTIVATED,
                        metadata.occurredAt(),
                        "team:" + teamId,
                        new TeamDeactivationV2Payload(teamId),
                        OutboxCompetitionLifecycleEvents.PRODUCER,
                        OutboxCompetitionLifecycleEvents.VERSION));
    }

    CompetitionLifecycleEventMessages pool(Long poolId, OutboxMetadata metadata) {
        return new CompetitionLifecycleEventMessages(
                EventType.POOL_DEACTIVATED.getValue(),
                "pool:" + poolId,
                "pool.deactivation",
                PoolDeactivationEvent.builder().poolId(poolId).build(),
                "pool.deactivation.v2",
                new PoolDeactivationV2Event(
                        null,
                        metadata.correlationId(),
                        metadata.eventId(),
                        EventType.POOL_DEACTIVATED,
                        metadata.occurredAt(),
                        "pool:" + poolId,
                        new PoolDeactivationV2Payload(poolId),
                        OutboxCompetitionLifecycleEvents.PRODUCER,
                        OutboxCompetitionLifecycleEvents.VERSION));
    }

    CompetitionLifecycleEventMessages club(String clubId, OutboxMetadata metadata) {
        return new CompetitionLifecycleEventMessages(
                EventType.CLUB_DEACTIVATED.getValue(),
                "club:" + clubId,
                "club.deactivation",
                ClubDeactivationEvent.builder().clubId(clubId).build(),
                "club.deactivation.v2",
                new ClubDeactivationV2Event(
                        null,
                        metadata.correlationId(),
                        metadata.eventId(),
                        EventType.CLUB_DEACTIVATED,
                        metadata.occurredAt(),
                        "club:" + clubId,
                        new ClubDeactivationV2Payload(clubId),
                        OutboxCompetitionLifecycleEvents.PRODUCER,
                        OutboxCompetitionLifecycleEvents.VERSION));
    }

    CompetitionLifecycleEventMessages teamByPool(Long teamId, Long poolId) {
        return new CompetitionLifecycleEventMessages(
                "TEAM_DEACTIVATED_BY_POOL_V1_ONLY",
                "pool:%d:team:%d".formatted(poolId, teamId),
                "teambypool.deactivation",
                TeamDeactivationByPoolEvent.builder().teamId(teamId).poolId(poolId).build(),
                null,
                null);
    }
}
