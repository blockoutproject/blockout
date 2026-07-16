package com.blockout.workersearch.listeners.team;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.models.events.TeamDeactivationEvent;
import com.blockout.workersearch.services.index.TeamIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class TeamDeactivationListener {

    private static final Logger logger = LoggerFactory.getLogger(TeamDeactivationListener.class);
    private final TeamIndexService teamIndexService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_SEARCH)
    public void onTeamDeactivated(TeamDeactivationEvent event) {
        Long teamId = event.getTeamId();

        logger.info("Received team deactivation event",
                keyValue("action", "team_deactivated"),
                keyValue("teamId", teamId));

        teamIndexService.delete(teamId);

        logger.info("Team deleted from index",
                keyValue("action", "team_index_delete"),
                keyValue("teamId", teamId));
    }
}