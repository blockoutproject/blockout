package com.blockout.clubs.services;

import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.clubs.club.application.ClubEventPublisher;
import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.models.events.ClubUpsertEvent;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EventPublisher implements ClubEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishUpsert(ClubView club) {

        ClubUpsertEvent event = ClubUpsertEvent.builder()
                .id(club.id())
                .name(club.name())
                .logoUrl(club.logoUrl())
                .city(club.city())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "club.upsert",
                    event);

            logger.info("Club upsert event sent",
                    keyValue("action", "publish_club_upsert"),
                    keyValue("clubId", club.id()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish club event",
                    keyValue("clubId", club.id()), ex);
            throw ex;
        }
    }
}
