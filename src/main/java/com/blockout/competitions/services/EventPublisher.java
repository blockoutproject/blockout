package com.blockout.competitions.services;

import com.blockout.competitions.config.RabbitMQConfig;
import com.blockout.competitions.models.events.ClubDeactivatedEvent;
import com.blockout.competitions.models.events.PoolDeactivatedEvent;
import com.blockout.competitions.models.events.TeamDeactivatedByPoolEvent;
import com.blockout.competitions.models.events.TeamDeactivatedEvent;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTeamDeactivationEvent(Long teamId) {
        TeamDeactivatedEvent event = TeamDeactivatedEvent.builder().teamId(teamId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEACTIVATED_EXCHANGE,
                "team.deactivated",
                event);
    }

    public void publishPoolDeactivationEvent(Long poolId) {
        PoolDeactivatedEvent event = PoolDeactivatedEvent.builder().poolId(poolId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEACTIVATED_EXCHANGE,
                "pool.deactivated",
                event);
    }

    public void publishTeamDeactivationByPoolEvent(Long teamId, Long poolId) {
        TeamDeactivatedByPoolEvent event = TeamDeactivatedByPoolEvent.builder().teamId(teamId).poolId(poolId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEACTIVATED_EXCHANGE,
                "teambypool.deactivated",
                event);
    }

    public void publishClubDeactivationEvent(String clubId) {
        ClubDeactivatedEvent event = ClubDeactivatedEvent.builder().clubId(clubId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEACTIVATED_EXCHANGE,
                "club.deactivated",
                event);
    }
}