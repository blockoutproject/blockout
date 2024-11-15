package com.blockout.teams.listeners;

import com.blockout.teams.services.TeamService;
import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.teams.config.RabbitMQConfig;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PoolDeactivationListener {

    @Autowired
    private TeamService teamService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATED_QUEUE_TEAM)
    public void handlePoolDeactivated(PoolDeactivatedEvent event) {
        Long poolId = event.getPoolId();
        teamService.deactivateTeamsByPoolId(poolId);
    }
}