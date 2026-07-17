package com.blockout.teams.listeners;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.events.ClubDeactivationEvent;
import com.blockout.teams.models.events.TeamDeactivationEvent;
import com.blockout.teams.team.application.TeamService;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamListeners {

    private final TeamService teamService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS)
    public void handleTeamDeactivation(TeamDeactivationEvent event) {
        Long teamId = event.getTeamId();
        teamService.deactivate(teamId);
    }

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS)
    public void handleClubDeactivation(ClubDeactivationEvent event) {
        String clubId = event.getClubId();
        teamService.deactivateByClubId(clubId);
    }
}
