package com.blockout.pools.services;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.Pool;
import com.blockout.pools.models.events.PoolUpsertEvent;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);
    
    private final RabbitTemplate rabbitTemplate;

    public void publishPoolUpsert(Pool pool) {
        PoolUpsertEvent event = PoolUpsertEvent.builder()
                .id(pool.getId())
                .name(pool.getName())
                .divisionId(pool.getDivisionId())
                .leagueName(pool.getLeagueName())
                .season(pool.getSeason())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "pool.upsert",
                    event);
            logger.info("Pool upsert event sent",
                    keyValue("action", "publish_pool_upsert"),
                    keyValue("id", pool.getId()),
                    keyValue("name", pool.getName()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish pool event",
                    keyValue("id", pool.getId()),
                    keyValue("name", pool.getName()),
                    ex);
            throw ex; // ou retry / DLQ selon ta stratégie
        }
    }
}