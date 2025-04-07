package com.blockout.users.services;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import com.blockout.shared.events.UserFollowEvent;
import com.blockout.users.config.RabbitMQConfig;
import com.blockout.users.models.EntityType;

@Service
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public EventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishFollowEvent(Long userId, EntityType entityType, Long entityId, UserFollowEvent.EventType type) {
        UserFollowEvent event = UserFollowEvent.builder()
                .userId(userId)
                .entityType(entityType)
                .entityId(entityId)
                .eventType(type)
                .build();

        String routingKey = entityType.name().toLowerCase() + ".follow";

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.USER_FOLLOW_EXCHANGE,
                routingKey,
                event);
    }
}