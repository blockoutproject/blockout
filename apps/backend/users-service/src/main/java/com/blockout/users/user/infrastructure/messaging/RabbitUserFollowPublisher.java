package com.blockout.users.user.infrastructure.messaging;

import com.blockout.users.config.RabbitMQConfig;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.FollowEventType;
import com.blockout.users.user.application.ports.UserFollowPublisher;
import com.blockout.users.user.infrastructure.messaging.events.UserFollowEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RabbitUserFollowPublisher implements UserFollowPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publish(Long userId, EntityType entityType, Long entityId, FollowEventType eventType) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.USER_FOLLOW_EXCHANGE,
                entityType.name().toLowerCase() + ".follow",
                new UserFollowEvent(userId, entityType, entityId, eventType));
    }
}
