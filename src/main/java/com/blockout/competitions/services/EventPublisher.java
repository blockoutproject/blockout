package com.blockout.competitions.services;

import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.shared.events.TeamDeactivatedEvent;
import com.blockout.competitions.config.RabbitMQConfig;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class EventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishTeamDeactivationEvent(Long teamId) {
        TeamDeactivatedEvent event = new TeamDeactivatedEvent(teamId);
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.TEAM_DEACTIVATED_EXCHANGE,
                "",
                event);
    }

    public void publishPoolDeactivationEvent(Long poolId) {
        PoolDeactivatedEvent event = new PoolDeactivatedEvent(poolId);
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.POOL_DEACTIVATED_EXCHANGE,
                "",
                event);
    }
}