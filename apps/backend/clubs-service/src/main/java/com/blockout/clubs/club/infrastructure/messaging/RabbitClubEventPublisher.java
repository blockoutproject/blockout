package com.blockout.clubs.club.infrastructure.messaging;

import com.blockout.clubs.club.application.ports.ClubEventPublisher;
import com.blockout.clubs.club.application.views.ClubView;
import com.blockout.clubs.club.infrastructure.messaging.events.ClubUpsertEvent;
import com.blockout.clubs.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * RabbitMQ adapter for the existing Club lifecycle exchange.
 */
@Component
@RequiredArgsConstructor
public class RabbitClubEventPublisher implements ClubEventPublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(RabbitClubEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    /**
     * {@inheritDoc}
     */
    @Override
    public void publishClubUpsert(ClubView club) {
        ClubUpsertEvent event = ClubUpsertEvent.builder()
                .id(club.id())
                .name(club.name())
                .logoUrl(club.logoUrl())
                .city(club.city())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "club.upsert",
                event);
        LOGGER.info("Published club upsert event",
                keyValue("action", "publish_club_upsert"),
                keyValue("clubId", club.id()));
    }
}
