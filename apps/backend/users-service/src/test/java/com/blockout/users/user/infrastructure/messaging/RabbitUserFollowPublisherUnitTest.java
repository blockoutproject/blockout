package com.blockout.users.user.infrastructure.messaging;

import com.blockout.users.config.RabbitMQConfig;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.FollowEventType;
import com.blockout.users.user.infrastructure.messaging.events.UserFollowEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("User follow publisher")
class RabbitUserFollowPublisherUnitTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    @DisplayName("keeps the established exchange, routing key, and payload")
    void keepsEstablishedRabbitContract() {
        RabbitUserFollowPublisher publisher = new RabbitUserFollowPublisher(rabbitTemplate);

        publisher.publish(1L, EntityType.TEAM, 2L, FollowEventType.CREATED);

        verify(rabbitTemplate).convertAndSend(
                RabbitMQConfig.USER_FOLLOW_EXCHANGE,
                "team.follow",
                new UserFollowEvent(1L, EntityType.TEAM, 2L, FollowEventType.CREATED));
    }
}
