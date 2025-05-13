package com.blockout.clubs.services;

import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.clubs.models.Club;
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
public class EventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public void publishClubUpsert(Club club) {

        ClubUpsertEvent event = ClubUpsertEvent.builder()
                .id(club.getId())
                .name(club.getName())
                .city(club.getCity())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "club.upsert",
                    event);

            logger.info("Club upsert event sent",
                    keyValue("action", "publish_club_upsert"),
                    keyValue("clubId", club.getId()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish club event",
                    keyValue("clubId", club.getId()), ex);
            throw ex;   // ou retry / DLQ
        }
    }
}