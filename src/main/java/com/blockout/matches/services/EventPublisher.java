package com.blockout.matches.services;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.events.MatchFinishedEvent;

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

    public void publishMatchFinished(Match match) {
        MatchFinishedEvent event = MatchFinishedEvent.builder()
                .id(match.getId())
                .teamIdA(match.getTeamIdA())
                .teamIdB(match.getTeamIdB())
                .poolId(match.getPoolId())
                .set(match.getSet())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                    "match.finished",
                    event);

            logger.info("Match finished event sent",
                    keyValue("action", "publish_match_finished"),
                    keyValue("matchId", match.getId()),
                    keyValue("homeTeamId", match.getTeamIdA()),
                    keyValue("awayTeamId", match.getTeamIdB()),
                    keyValue("poolId", match.getPoolId()),
                    keyValue("set", match.getSet()));

        } catch (AmqpException ex) {
            logger.error("Failed to publish match.finished",
                    keyValue("matchId", match.getId()), ex);
            throw ex;
        }
    }
}