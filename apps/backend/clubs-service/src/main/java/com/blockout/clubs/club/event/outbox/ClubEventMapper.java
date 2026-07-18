package com.blockout.clubs.club.event.outbox;

import com.blockout.clubs.club.application.ClubUpsertFact;
import com.blockout.events.v2.model.ClubUpsertV2Event;
import com.blockout.events.v2.model.ClubUpsertV2Payload;
import com.blockout.events.v2.model.EventType;
import com.blockout.clubs.models.events.ClubUpsertEvent;
import com.blockout.outbox.OutboxMetadata;
import org.springframework.stereotype.Component;

@Component
class ClubEventMapper {

    ClubEventMessages map(ClubUpsertFact club, OutboxMetadata metadata) {
        var legacy = ClubUpsertEvent.builder()
                .id(club.id())
                .name(club.name())
                .logoUrl(club.logoUrl())
                .city(club.city())
                .build();
        var canonical = new ClubUpsertV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.CLUB_UPSERT,
                metadata.occurredAt(),
                "club:" + club.id(),
                new ClubUpsertV2Payload(club.city(), club.id(), club.logoUrl(), club.name()),
                OutboxClubEventPublisher.PRODUCER,
                OutboxClubEventPublisher.VERSION);
        return new ClubEventMessages(legacy, canonical);
    }
}
