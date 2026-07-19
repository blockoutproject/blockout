package com.blockout.pools.pool.event.outbox;

import com.blockout.events.v2.model.EventType;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.pool.application.PoolEventData;
import com.blockout.pools.pool.application.PoolEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Records both pool wire versions atomically; Rabbit publication is owned by the outbox job. */
@Component
@RequiredArgsConstructor
public class OutboxPoolEventPublisher implements PoolEventPublisher {

    static final String PRODUCER = "pools-service";
    static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final PoolEventMapper mapper;

    @Override
    public void publishUpsert(PoolEventData pool) {
        OutboxMetadata metadata = outbox.newMetadata();
        PoolEventMessages messages = mapper.map(pool, metadata);
        outbox.record(new OutboxEvent(
                metadata,
                EventType.POOL_UPSERT.getValue(),
                VERSION,
                PRODUCER,
                "pool:" + pool.id(),
                null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "pool.upsert",
                messages.legacy(),
                "pool.upsert.v2",
                messages.canonical()));
    }

    @Override
    public void publishProjection(PoolEventData pool) {
        OutboxMetadata metadata = outbox.newMetadata();
        outbox.record(new OutboxEvent(
                metadata,
                EventType.POOL_PROJECTION_CHANGED.getValue(),
                VERSION,
                PRODUCER,
                "pool:" + pool.id(),
                pool.revision(),
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                null,
                null,
                "pool.projection-changed.v2",
                mapper.mapProjection(pool, metadata)));
    }
}
