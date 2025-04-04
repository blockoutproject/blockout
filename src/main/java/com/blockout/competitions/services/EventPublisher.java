package com.blockout.competitions.services;

import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.shared.events.TeamDeactivatedByPoolEvent;
import com.blockout.shared.events.TeamDeactivatedEvent;
import com.blockout.competitions.config.RabbitMQConfig;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public EventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

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
}