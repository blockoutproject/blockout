package com.blockout.notifications.listeners;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.models.events.MatchFinishedEvent;
import com.blockout.notifications.services.NotificationOrchestratorService;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MatchFinishedListener {

    private static final Logger logger = LoggerFactory.getLogger(MatchFinishedListener.class);

    private final NotificationOrchestratorService orchestrator;

    @RabbitListener(queues = RabbitMQConfig.MATCH_FINISHED_QUEUE)
    public void onMatchFinished(MatchFinishedEvent event) {
        Long matchId = event.getId();
        logger.info("Received match.finished",
                keyValue("action", "match_finished_received"),
                keyValue("matchId", matchId),
                keyValue("teamIdA", event.getTeamIdA()),
                keyValue("teamIdB", event.getTeamIdB()),
                keyValue("poolId", event.getPoolId()));

        // Prépare les listes (null-safe)
        List<Long> teamIds = List.of(event.getTeamIdA(), event.getTeamIdB()).stream()
                .filter(id -> id != null).toList();
        List<Long> poolIds = event.getPoolId() == null ? List.of() : List.of(event.getPoolId());

        orchestrator.handleMatchFinished(matchId, teamIds, poolIds, event.getSet());
    }
}