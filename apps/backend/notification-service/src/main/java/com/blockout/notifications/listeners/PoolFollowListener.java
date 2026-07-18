package com.blockout.notifications.listeners;

import com.blockout.shared.model.FollowerProjectionActionEnum;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.events.application.EventConsumption;
import com.blockout.notifications.followers.application.FollowerProjectionCommand;
import com.blockout.notifications.followers.application.FollowerProjectionConsumer;
import com.blockout.notifications.followers.inbound.FavoriteV2MessageDecoder;
import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.shared.model.EntityEventActionEnum;
import com.blockout.notifications.models.events.UserFollowEvent;
import java.util.Objects;
import org.springframework.amqp.core.Message;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class PoolFollowListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolFollowListener.class);
    private final FollowerProjectionConsumer followerProjection;
    private final FavoriteV2MessageDecoder decoder;
    private final EventConsumption consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.POOL_FOLLOW_QUEUE_NOTIFICATIONS,
            autoStartup = "${blockout.events.consumers.favorites-v1-enabled:true}",
            ackMode = "AUTO")
    public void onPoolFollowChanged(
            UserFollowEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        logger.info("Received pool.follow event",
                keyValue("action", "pool_follow_event"),
                keyValue("userId", event.getUserId()),
                keyValue("entityType", event.getEntityType()),
                keyValue("entityId", event.getEntityId()),
                keyValue("eventType", event.getEventType()));

        FollowerProjectionCommand command = legacyCommand(event);
        consumedEvents.processLegacy(eventId, legacyType(event), () -> followerProjection.apply(command));
    }

    @RabbitListener(
            queues = RabbitMQConfig.POOL_FOLLOW_QUEUE_NOTIFICATIONS_V2,
            autoStartup = "${blockout.events.consumers.favorites-v2-enabled:false}",
            ackMode = "AUTO")
    public void onPoolFavoriteV2(Message message) {
        var decoded = decoder.decodePool(message);
        consumedEvents.processV2(
                decoded.eventId(), decoded.eventIdHeader(), decoded.eventType(), () ->
                        followerProjection.apply(decoded.command()));
    }

    private String legacyType(UserFollowEvent event) {
        return event.getEventType() == EntityEventActionEnum.CREATED ? "POOL_FOLLOWED" : "POOL_UNFOLLOWED";
    }

    private FollowerProjectionCommand legacyCommand(UserFollowEvent event) {
        EntityEventActionEnum eventType = Objects.requireNonNull(event.getEventType(), "eventType is required");
        FollowerProjectionActionEnum action = eventType == EntityEventActionEnum.CREATED
                ? FollowerProjectionActionEnum.FOLLOW
                : FollowerProjectionActionEnum.UNFOLLOW;
        return new FollowerProjectionCommand(
                event.getUserId(), EntityTypeEnum.POOL, event.getEntityId(), action);
    }
}
