package com.blockout.notifications.listeners;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.events.ConsumedEventProcessor;
import com.blockout.notifications.followers.inbound.FavoriteV2MessageDecoder;
import com.blockout.notifications.models.enums.EventType;
import com.blockout.notifications.models.events.UserFollowEvent;
import com.blockout.notifications.services.FollowersProjectionService;
import org.springframework.amqp.core.Message;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class PoolFollowListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolFollowListener.class);
    private final FollowersProjectionService followersProjectionService;
    private final FavoriteV2MessageDecoder decoder;
    private final ConsumedEventProcessor consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.POOL_FOLLOW_QUEUE_NOTIFICATIONS,
            autoStartup = "${blockout.events.consumers.favorites-v1-enabled:true}")
    public void onPoolFollowChanged(
            UserFollowEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        logger.info("Received pool.follow event",
                keyValue("action", "pool_follow_event"),
                keyValue("userId", event.getUserId()),
                keyValue("entityType", event.getEntityType()),
                keyValue("entityId", event.getEntityId()),
                keyValue("eventType", event.getEventType()));

        consumedEvents.processLegacy(eventId, legacyType(event), () -> applyLegacy(event));
    }

    @RabbitListener(
            queues = RabbitMQConfig.POOL_FOLLOW_QUEUE_NOTIFICATIONS_V2,
            autoStartup = "${blockout.events.consumers.favorites-v2-enabled:false}")
    public void onPoolFavoriteV2(Message message) {
        var decoded = decoder.decodePool(message);
        consumedEvents.processV2(
                decoded.eventId(), decoded.eventIdHeader(), decoded.eventType(), () ->
                        followersProjectionService.apply(decoded.command()));
    }

    private String legacyType(UserFollowEvent event) {
        return event.getEventType() == EventType.CREATED ? "POOL_FOLLOWED" : "POOL_UNFOLLOWED";
    }

    private void applyLegacy(UserFollowEvent event) {
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
