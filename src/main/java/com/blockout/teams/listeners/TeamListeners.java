package com.blockout.teams.listeners;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.EntityType;
import com.blockout.teams.models.events.ClubDeactivationEvent;
import com.blockout.teams.models.events.TeamDeactivationEvent;
import com.blockout.teams.models.events.UserFollowEvent;
import com.blockout.teams.services.TeamService;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamListeners {

    private final TeamService teamService;
    private static final Logger logger = LoggerFactory.getLogger(TeamService.class);

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS)
    public void handleTeamDeactivation(TeamDeactivationEvent event) {
        Long teamId = event.getTeamId();
        teamService.deactivateTeam(teamId);
    }

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS)
    public void handleClubDeactivation(ClubDeactivationEvent event) {
        String clubId = event.getClubId();
        teamService.deactivateTeamsByClubId(clubId);
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_FOLLOW_QUEUE)
    public void handleFollowEvent(UserFollowEvent event) {
        if (event.getEntityType() != EntityType.TEAM) {
            logger.error("Received event for non-team entity type: {}", event.getEntityType());
            return;
        }
    
        switch (event.getEventType()) {
            case CREATED -> teamService.incrementFollowersCount(event.getEntityId(), event.getUserId());
            case DELETED -> teamService.decrementFollowersCount(event.getEntityId(), event.getUserId());
        }
    }
}