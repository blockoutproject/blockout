package com.blockout.matches.listeners;

import com.blockout.matches.services.MatchService;

import lombok.RequiredArgsConstructor;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.models.events.TeamDeactivationEvent;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamDeactivationListener {

    private final MatchService matchService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_MATCHES)
    public void handleTeamDeactivation(TeamDeactivationEvent event) {
        Long teamId = event.getTeamId();
        matchService.deactivateMatchesByTeamId(teamId);
    }
}