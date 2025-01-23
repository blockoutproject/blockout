package com.blockout.teams.listeners;

import com.blockout.teams.services.TeamService;
import com.blockout.shared.events.TeamDeactivatedEvent;
import com.blockout.teams.config.RabbitMQConfig;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TeamDeactivationListener {

    @Autowired
    private TeamService teamService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATED_QUEUE_TEAMS)
    public void handlePoolDeactivated(TeamDeactivatedEvent event) {
        Long teamId = event.getTeamId();
        teamService.deactivateTeam(teamId);
    }
}