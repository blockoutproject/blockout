package com.blockout.notifications.notification.infrastructure.messaging;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.notification.application.NotificationOrchestratorApplicationService;
import com.blockout.notifications.notification.infrastructure.messaging.events.MatchFinishedEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MatchFinishedListener {

    private static final Logger logger = LoggerFactory.getLogger(MatchFinishedListener.class);

    private final NotificationOrchestratorApplicationService orchestrator;

    @RabbitListener(queues = RabbitMQConfig.MATCH_FINISHED_QUEUE)
    public void onMatchFinished(MatchFinishedEvent event) {
        Long matchId = event.getId();
        Long teamIdA = event.getTeamIdA();
        Long teamIdB = event.getTeamIdB();
        Long poolId = event.getPoolId();
        String set = event.getSet();

        logger.info("Received match.finished",
            keyValue("action", "match_finished_received"),
            keyValue("matchId", matchId),
            keyValue("set", set),
            keyValue("teamIdA", event.getTeamIdA()),
            keyValue("teamIdB", event.getTeamIdB()),
            keyValue("poolId", event.getPoolId()));

        orchestrator.handleMatchFinished(matchId, teamIdA, teamIdB, poolId, set);
    }
}
