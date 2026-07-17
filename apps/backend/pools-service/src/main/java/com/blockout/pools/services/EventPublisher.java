package com.blockout.pools.services;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.enums.Format;
import com.blockout.pools.models.enums.Gender;
import com.blockout.pools.models.events.PoolUpsertEvent;
import com.blockout.pools.pool.application.PoolEventPublisher;
import com.blockout.pools.pool.application.PoolView;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EventPublisher implements PoolEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishUpsert(PoolView pool) {
        PoolUpsertEvent event = PoolUpsertEvent.builder()
                .id(pool.id())
                .name(pool.name())
                .shortName(pool.shortName())
                .divisionId(pool.divisionId())
                .leagueCode(pool.leagueCode())
                .leagueName(pool.leagueName())
                .season(pool.season())
                .format(pool.format() == null ? null : Format.valueOf(pool.format().name()))
                .gender(pool.gender() == null ? null : Gender.valueOf(pool.gender().name()))
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "pool.upsert",
                    event);
            logger.info("Pool upsert event sent",
                    keyValue("action", "publish_pool_upsert"),
                    keyValue("id", pool.id()),
                    keyValue("name", pool.name()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish pool event",
                    keyValue("id", pool.id()),
                    keyValue("name", pool.name()),
                    ex);
            throw ex; // ou retry / DLQ selon ta stratégie
        }
    }
}
