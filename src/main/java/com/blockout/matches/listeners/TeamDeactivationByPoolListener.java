package com.blockout.matches.listeners;

import com.blockout.matches.services.MatchService;

import lombok.RequiredArgsConstructor;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.models.events.TeamDeactivationByPoolEvent;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamDeactivationByPoolListener {

    private final MatchService matchService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_BY_POOL_DEACTIVATION_QUEUE_MATCHES)
    public void handleTeamDeactivation(TeamDeactivationByPoolEvent event) {
        Long teamId = event.getTeamId();
        Long poolId = event.getPoolId();
        matchService.deactivateMatchesByTeamAndPool(teamId, poolId);
    }
}