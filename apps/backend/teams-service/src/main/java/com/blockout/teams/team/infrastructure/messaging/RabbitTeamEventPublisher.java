package com.blockout.teams.team.infrastructure.messaging;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.team.application.ports.TeamEventPublisher;
import com.blockout.teams.team.application.views.TeamView;
import com.blockout.teams.team.infrastructure.messaging.events.TeamUpsertEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ adapter for Team lifecycle messages.
 */
@Component
@RequiredArgsConstructor
public class RabbitTeamEventPublisher implements TeamEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishTeamUpsert(TeamView team) {
        TeamUpsertEvent event = new TeamUpsertEvent(team.id(), team.name(), team.shortName(), team.clubId(),
            team.divisionId(), team.format(), team.gender(), team.season(), team.logoUrl());
        rabbitTemplate.convertAndSend(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "team.upsert", event);
    }
}
