package com.blockout.workernotifications.listeners;

import com.blockout.workernotifications.config.RabbitMQConfig;
import com.blockout.workernotifications.models.enums.EventType;
import com.blockout.workernotifications.models.events.UserFollowEvent;
import com.blockout.workernotifications.services.FollowersProjectionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class PoolFollowListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolFollowListener.class);
    private final FollowersProjectionService followersProjectionService;

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