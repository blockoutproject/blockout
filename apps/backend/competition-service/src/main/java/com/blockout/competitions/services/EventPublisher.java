package com.blockout.competitions.services;

import com.blockout.competitions.config.RabbitMQConfig;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleEvents;
import com.blockout.competitions.models.events.ClubDeactivationEvent;
import com.blockout.competitions.models.events.PoolDeactivationEvent;
import com.blockout.competitions.models.events.TeamDeactivationByPoolEvent;
import com.blockout.competitions.models.events.TeamDeactivationEvent;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventPublisher implements CompetitionLifecycleEvents {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishTeamDeactivation(Long teamId) {
        TeamDeactivationEvent event = TeamDeactivationEvent.builder().teamId(teamId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "team.deactivation",
                event);
    }

    @Override
    public void publishPoolDeactivation(Long poolId) {
        PoolDeactivationEvent event = PoolDeactivationEvent.builder().poolId(poolId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "pool.deactivation",
                event);
    }

    @Override
    public void publishTeamDeactivationByPool(Long teamId, Long poolId) {
        TeamDeactivationByPoolEvent event = TeamDeactivationByPoolEvent.builder().teamId(teamId).poolId(poolId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "teambypool.deactivation",
                event);
    }

    @Override
    public void publishClubDeactivation(String clubId) {
        ClubDeactivationEvent event = ClubDeactivationEvent.builder().clubId(clubId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "club.deactivation",
                event);
    }
}
