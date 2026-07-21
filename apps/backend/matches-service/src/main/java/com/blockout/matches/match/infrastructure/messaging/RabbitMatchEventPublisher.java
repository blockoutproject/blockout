package com.blockout.matches.match.infrastructure.messaging;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.MatchView;
import com.blockout.matches.match.infrastructure.messaging.events.MatchFinishedEvent;
import com.blockout.matches.match.infrastructure.messaging.events.MatchLiveLinkCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class RabbitMatchEventPublisher implements MatchEventPublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(RabbitMatchEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishMatchFinished(MatchView match) {
        rabbitTemplate.convertAndSend(
            RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
            RabbitMQConfig.RK_MATCH_FINISHED,
            new MatchFinishedEvent(match.id(), match.teamIdA(), match.teamIdB(), match.poolId(), match.set()));
        LOGGER.info("Published match finished event", keyValue("action", "publish_match_finished"),
            keyValue("matchId", match.id()));
    }

    @Override
    public void publishMatchLiveLinkCreated(MatchView match) {
        rabbitTemplate.convertAndSend(
            RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
            RabbitMQConfig.RK_MATCH_LIVE_LINK_CREATED,
            new MatchLiveLinkCreatedEvent(match.id(), match.teamIdA(), match.teamIdB(), match.poolId()));
        LOGGER.info("Published match live link event", keyValue("action", "publish_match_live_link_created"),
            keyValue("matchId", match.id()));
    }
}
