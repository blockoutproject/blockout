package com.blockout.teams.listeners;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.shared.events.TeamDeactivatedEvent;
import com.blockout.shared.events.UserFollowCreatedEvent;
import com.blockout.shared.events.UserFollowDeletedEvent;
import com.blockout.teams.services.TeamService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class TeamListeners {

    private final TeamService teamService;

    public TeamListeners(TeamService teamService) {
        this.teamService = teamService;
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATED_QUEUE_TEAMS)
    public void handleTeamDeactivated(TeamDeactivatedEvent event) {
        Long teamId = event.getTeamId();
        teamService.deactivateTeam(teamId);
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_FOLLOW_QUEUE)
    public void handleFollowCreated(UserFollowCreatedEvent event) {
        switch (event.getEntityType()) {
            case TEAM -> teamService.incrementFollowersCount(event.getEntityId(), event.getUserId());
            default -> {}
        }
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_FOLLOW_QUEUE)
    public void handleFollowDeleted(UserFollowDeletedEvent event) {
        switch (event.getEntityType()) {
            case TEAM -> teamService.decrementFollowersCount(event.getEntityId(), event.getUserId());
            default -> {}
        }
    }
}