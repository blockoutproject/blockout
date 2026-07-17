package com.blockout.users.services;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import com.blockout.users.config.RabbitMQConfig;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.models.enums.EventType;
import com.blockout.users.models.events.UserFollowEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventPublisher implements FavoriteEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    private void publishFollowEvent(Long userId, EntityType entityType, Long entityId, EventType type) {
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

    /** {@inheritDoc} */
    @Override
    public void publishCreated(Long userId, EntityType entityType, Long entityId) {
        publishFollowEvent(userId, entityType, entityId, EventType.CREATED);
    }

    /** {@inheritDoc} */
    @Override
    public void publishDeleted(Long userId, EntityType entityType, Long entityId) {
        publishFollowEvent(userId, entityType, entityId, EventType.DELETED);
    }
}
