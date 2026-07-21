package com.blockout.teams.team.infrastructure.messaging;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.team.application.TeamService;
import com.blockout.teams.team.infrastructure.messaging.events.ClubDeactivationEvent;
import com.blockout.teams.team.infrastructure.messaging.events.TeamDeactivationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumes deactivation commands handled by teams-service.
 */
@Component
@RequiredArgsConstructor
public class TeamCommandListener {

    private final TeamService teamService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS)
    public void handleTeamDeactivation(TeamDeactivationEvent event) {
        teamService.deactivateTeam(event.teamId());
    }

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS)
    public void handleClubDeactivation(ClubDeactivationEvent event) {
        teamService.deactivateTeamsByClubId(event.clubId());
    }
}
