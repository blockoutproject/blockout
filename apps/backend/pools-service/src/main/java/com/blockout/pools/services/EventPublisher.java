package com.blockout.pools.services;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.events.v2.model.PoolUpsertV2Payload;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.enums.Format;
import com.blockout.pools.models.enums.Gender;
import com.blockout.pools.models.events.PoolUpsertEvent;
import com.blockout.pools.pool.application.PoolEventPublisher;
import com.blockout.pools.pool.application.PoolView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Records both pool wire versions atomically; Rabbit publication is owned by the outbox job. */
@Service
@RequiredArgsConstructor
public class EventPublisher implements PoolEventPublisher {

    private static final String PRODUCER = "pools-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;

    @Override
    public void publishUpsert(PoolView pool) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = PoolUpsertEvent.builder()
                .id(pool.id()).name(pool.name()).shortName(pool.shortName()).divisionId(pool.divisionId())
                .leagueCode(pool.leagueCode()).leagueName(pool.leagueName()).season(pool.season())
                .format(pool.format() == null ? null : Format.valueOf(pool.format().name()))
                .gender(pool.gender() == null ? null : Gender.valueOf(pool.gender().name())).build();
        var canonical = new PoolUpsertV2Event(
                null, metadata.correlationId(), metadata.eventId(), EventType.POOL_UPSERT, metadata.occurredAt(),
                "pool:" + pool.id(), new PoolUpsertV2Payload(
                        pool.divisionId(), value(pool.format()), value(pool.gender()), pool.id(), pool.leagueCode(),
                        pool.leagueName(), pool.name(), pool.season(), pool.shortName()), PRODUCER, VERSION);
        outbox.record(new OutboxEvent(
                metadata, EventType.POOL_UPSERT.getValue(), VERSION, PRODUCER, "pool:" + pool.id(), null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "pool.upsert", legacy, "pool.upsert.v2", canonical));
    }

    private String value(Object value) {
        return value == null ? null : value.toString();
    }
}
