package com.blockout.matches.listeners;

import com.blockout.matches.services.MatchService;
import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.models.events.TeamDeactivatedEvent;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class TeamDeactivationListener {

    private final MatchService matchService;

    public TeamDeactivationListener(MatchService matchService) {
        this.matchService = matchService;
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATED_QUEUE_MATCHES)
    public void handleTeamDeactivated(TeamDeactivatedEvent event) {
        Long teamId = event.getTeamId();
        matchService.deactivateMatchesByTeamId(teamId);
    }
}