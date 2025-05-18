package com.blockout.competitions.services;

import com.blockout.competitions.config.RabbitMQConfig;
import com.blockout.competitions.models.events.ClubDeactivationEvent;
import com.blockout.competitions.models.events.PoolDeactivationEvent;
import com.blockout.competitions.models.events.TeamDeactivationByPoolEvent;
import com.blockout.competitions.models.events.TeamDeactivationEvent;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTeamDeactivationEvent(Long teamId) {
        TeamDeactivationEvent event = TeamDeactivationEvent.builder().teamId(teamId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "team.deactivation",
                event);
    }

    public void publishPoolDeactivationEvent(Long poolId) {
        PoolDeactivationEvent event = PoolDeactivationEvent.builder().poolId(poolId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "pool.deactivation",
                event);
    }

    public void publishTeamDeactivationByPoolEvent(Long teamId, Long poolId) {
        TeamDeactivationByPoolEvent event = TeamDeactivationByPoolEvent.builder().teamId(teamId).poolId(poolId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "teambypool.deactivation",
                event);
    }

    public void publishClubDeactivationEvent(String clubId) {
        ClubDeactivationEvent event = ClubDeactivationEvent.builder().clubId(clubId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "club.deactivation",
                event);
    }
}