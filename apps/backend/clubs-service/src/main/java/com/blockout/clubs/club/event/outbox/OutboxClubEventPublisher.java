package com.blockout.clubs.club.event.outbox;

import com.blockout.clubs.club.application.ClubEventPublisher;
import com.blockout.clubs.club.application.ClubEventData;
import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.events.v2.model.EventType;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Records both club wire versions atomically; Rabbit publication is owned by the outbox job. */
@Component
@RequiredArgsConstructor
public class OutboxClubEventPublisher implements ClubEventPublisher {

    static final String PRODUCER = "clubs-service";
    static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final ClubEventMapper mapper;

    @Override
    public void publishUpsert(ClubEventData club) {
        OutboxMetadata metadata = outbox.newMetadata();
        ClubEventMessages messages = mapper.map(club, metadata);
        outbox.record(new OutboxEvent(
                metadata,
                EventType.CLUB_UPSERT.getValue(),
                VERSION,
                PRODUCER,
                "club:" + club.id(),
                null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "club.upsert",
                messages.legacy(),
                "club.upsert.v2",
                messages.canonical()));
    }

    @Override
    public void publishProjection(ClubEventData club) {
        OutboxMetadata metadata = outbox.newMetadata();
        outbox.record(new OutboxEvent(
                metadata,
                EventType.CLUB_PROJECTION_CHANGED.getValue(),
                VERSION,
                PRODUCER,
                "club:" + club.id(),
                club.revision(),
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                null,
                null,
                "club.projection-changed.v2",
                mapper.mapProjection(club, metadata)));
    }
}
