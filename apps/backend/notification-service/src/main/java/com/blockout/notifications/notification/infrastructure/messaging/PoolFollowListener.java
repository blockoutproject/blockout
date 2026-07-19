package com.blockout.notifications.notification.infrastructure.messaging;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.notification.application.FollowersProjectionApplicationService;
import com.blockout.notifications.notification.infrastructure.messaging.events.EventType;
import com.blockout.notifications.notification.infrastructure.messaging.events.UserFollowEvent;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class PoolFollowListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolFollowListener.class);
    private final FollowersProjectionApplicationService followersProjectionService;

    @RabbitListener(queues = RabbitMQConfig.POOL_FOLLOW_QUEUE_NOTIFICATIONS)
    public void onPoolFollowChanged(UserFollowEvent event) {
        logger.info("Received pool.follow event",
                keyValue("action", "pool_follow_event"),
                keyValue("userId", event.getUserId()),
                keyValue("entityType", event.getEntityType()),
                keyValue("entityId", event.getEntityId()),
                keyValue("eventType", event.getEventType()));

        if (event.getEventType() == EventType.CREATED) {
            followersProjectionService.followPool(event.getUserId(), event.getEntityId());
            logger.info("Projection updated (FOLLOW pool)",
                    keyValue("action", "followers_projection_upsert_pool"),
                    keyValue("userId", event.getUserId()),
                    keyValue("poolId", event.getEntityId()));
        } else if (event.getEventType() == EventType.DELETED) {
            followersProjectionService.unfollowPool(event.getUserId(), event.getEntityId());
            logger.info("Projection updated (UNFOLLOW pool)",
                    keyValue("action", "followers_projection_delete_pool"),
                    keyValue("userId", event.getUserId()),
                    keyValue("poolId", event.getEntityId()));
        }
    }
}
