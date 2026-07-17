package com.blockout.clubs.services;

import com.blockout.clubs.club.application.ClubEventPublisher;
import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.clubs.models.events.ClubUpsertEvent;
import com.blockout.events.v2.model.ClubUpsertV2Event;
import com.blockout.events.v2.model.ClubUpsertV2Payload;
import com.blockout.events.v2.model.EventType;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Records both club wire versions atomically; Rabbit publication is owned by the outbox job. */
@Service
@RequiredArgsConstructor
public class EventPublisher implements ClubEventPublisher {

    private static final String PRODUCER = "clubs-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;

    @Override
    public void publishUpsert(ClubView club) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = ClubUpsertEvent.builder()
                .id(club.id()).name(club.name()).logoUrl(club.logoUrl()).city(club.city()).build();
        var canonical = new ClubUpsertV2Event(
                null, metadata.correlationId(), metadata.eventId(), EventType.CLUB_UPSERT, metadata.occurredAt(),
                "club:" + club.id(), new ClubUpsertV2Payload(club.city(), club.id(), club.logoUrl(), club.name()),
                PRODUCER, VERSION);
        outbox.record(new OutboxEvent(
                metadata, EventType.CLUB_UPSERT.getValue(), VERSION, PRODUCER, "club:" + club.id(), null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "club.upsert", legacy, "club.upsert.v2", canonical));
    }
}
