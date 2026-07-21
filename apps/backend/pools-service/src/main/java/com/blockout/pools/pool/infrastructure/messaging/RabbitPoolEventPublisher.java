package com.blockout.pools.pool.infrastructure.messaging;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.pool.application.ports.PoolEventPublisher;
import com.blockout.pools.pool.application.views.PoolView;
import com.blockout.pools.pool.infrastructure.messaging.events.PoolUpsertEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ adapter for Pool lifecycle messages.
 */
@Component
@RequiredArgsConstructor
public class RabbitPoolEventPublisher implements PoolEventPublisher {
    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishPoolUpsert(PoolView pool) {
        rabbitTemplate.convertAndSend(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "pool.upsert",
            new PoolUpsertEvent(pool.id(), pool.name(), pool.shortName(), pool.divisionId(), pool.leagueCode(),
                pool.leagueName(), pool.season(), pool.format(), pool.gender()));
    }
}
