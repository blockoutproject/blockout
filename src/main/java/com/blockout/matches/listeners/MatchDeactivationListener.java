package com.blockout.matches.listeners;

import com.blockout.matches.services.MatchService;
import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.shared.events.TeamDeactivatedEvent;
import com.blockout.matches.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class MatchDeactivationListener {

    @Autowired
    private MatchService matchService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATED_QUEUE_MATCH)
    public void handlePoolDeactivated(PoolDeactivatedEvent event) {
        Long poolId = event.getPoolId();
        matchService.deactivateMatchesByPoolId(poolId);
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATED_QUEUE)
    public void handleTeamDeactivated(TeamDeactivatedEvent event) {
        Long teamId = event.getTeamId();
        matchService.deactivateMatchesByTeamId(teamId);
    }
}