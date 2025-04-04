package com.blockout.users.services;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import com.blockout.shared.events.UserFollowCreatedEvent;
import com.blockout.shared.events.UserFollowDeletedEvent;
import com.blockout.users.config.RabbitMQConfig;
import com.blockout.users.models.EntityType;

@Service
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public EventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishFollowCreatedEvent(Long userId, EntityType entityType, Long entityId) {
        UserFollowCreatedEvent event = UserFollowCreatedEvent.builder()
                .userId(userId)
                .entityType(entityType)
                .entityId(entityId)
                .build();

        // Par ex: team.created ou pool.created
        String routingKey = entityType.name().toLowerCase() + ".created";

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.USER_FOLLOW_EXCHANGE,
                routingKey,
                event);
    }

    public void publishFollowDeletedEvent(Long userId, EntityType entityType, Long entityId) {
        UserFollowDeletedEvent event = UserFollowDeletedEvent.builder()
                .userId(userId)
                .entityType(entityType)
                .entityId(entityId)
                .build();

        String routingKey = entityType.name().toLowerCase() + ".deleted";

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.USER_FOLLOW_EXCHANGE,
                routingKey,
                event);
    }
}