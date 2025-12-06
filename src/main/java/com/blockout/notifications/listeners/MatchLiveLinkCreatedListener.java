package com.blockout.notifications.listeners;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.models.events.MatchLiveLinkCreatedEvent;
import com.blockout.notifications.services.NotificationOrchestratorService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MatchLiveLinkCreatedListener {

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkCreatedListener.class);

    private final NotificationOrchestratorService orchestrator;

    @RabbitListener(queues = RabbitMQConfig.MATCH_LIVE_LINK_CREATED_QUEUE)
    public void onMatchLiveLinkCreated(MatchLiveLinkCreatedEvent event) {
        Long matchId = event.getId();
        Long teamIdA = event.getTeamIdA();
        Long teamIdB = event.getTeamIdB();
        Long poolId = event.getPoolId();

        logger.info("Received match.live_link_created",
                keyValue("action", "match_live_link_created_received"),
                keyValue("matchId", matchId),
                keyValue("teamIdA", teamIdA),
                keyValue("teamIdB", teamIdB),
                keyValue("poolId", poolId));

        orchestrator.handleMatchLiveLinkCreated(matchId, teamIdA, teamIdB, poolId);
    }
}
