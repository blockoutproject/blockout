package com.blockout.pools.services;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.Pool;
import com.blockout.pools.models.events.PoolUpsertEvent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class EventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    private final RabbitTemplate rabbitTemplate;

    public EventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishPoolUpsert(Pool pool) {
        PoolUpsertEvent event = PoolUpsertEvent.builder()
                .poolId(pool.getId())
                .divisionName(pool.getDivisionName())
                .poolName(pool.getPoolName())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "pool.upsert",
                    event);
            logger.info("Pool upsert event sent",
                    keyValue("action", "publish_pool_upsert"),
                    keyValue("poolId", pool.getId()));
        } catch (AmqpException ex) {
            logger.error("Failed to publish pool event",
                    keyValue("poolId", pool.getId()), ex);
            throw ex; // ou retry / DLQ selon ta stratégie
        }
    }
}