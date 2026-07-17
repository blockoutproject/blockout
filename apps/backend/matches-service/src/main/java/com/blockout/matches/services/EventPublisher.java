package com.blockout.matches.services;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.match.application.MatchFinishedEventInput;
import com.blockout.matches.match.application.MatchLifecycleEvents;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import com.blockout.matches.match.live.application.MatchLiveLinkEvents;
import com.blockout.matches.models.events.MatchFinishedEvent;
import com.blockout.matches.models.events.MatchLiveLinkCreatedEvent;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EventPublisher implements MatchLifecycleEvents, MatchLiveLinkEvents {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishMatchFinished(MatchFinishedEventInput input) {
        MatchFinishedEvent event = MatchFinishedEvent.builder()
                .id(input.matchId())
                .teamIdA(input.teamIdA())
                .teamIdB(input.teamIdB())
                .poolId(input.poolId())
                .set(input.set())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    RabbitMQConfig.RK_MATCH_FINISHED,
                    event
            );

            logger.info("Match finished event sent",
                    keyValue("action", "publish_match_finished"),
                    keyValue("matchId", input.matchId()),
                    keyValue("homeTeamId", input.teamIdA()),
                    keyValue("awayTeamId", input.teamIdB()),
                    keyValue("poolId", input.poolId()),
                    keyValue("set", input.set()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish match.finished",
                    keyValue("matchId", input.matchId()), ex);
            throw ex;
        }
    }

    @Override
    public void publishMatchLiveLinkCreated(MatchLiveLinkCreatedEventInput input) {
        MatchLiveLinkCreatedEvent event = MatchLiveLinkCreatedEvent.builder()
                .id(input.matchId())
                .teamIdA(input.teamIdA())
                .teamIdB(input.teamIdB())
                .poolId(input.poolId())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    RabbitMQConfig.RK_MATCH_LIVE_LINK_CREATED,
                    event
            );

            logger.info("Match live-link-created event sent",
                    keyValue("action", "publish_match_live_link_created"),
                    keyValue("matchId", input.matchId()),
                    keyValue("teamIdA", input.teamIdA()),
                    keyValue("teamIdB", input.teamIdB()),
                    keyValue("poolId", input.poolId()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish match.live-link-created",
                    keyValue("matchId", input.matchId()), ex);
            throw ex;
        }
    }
}
