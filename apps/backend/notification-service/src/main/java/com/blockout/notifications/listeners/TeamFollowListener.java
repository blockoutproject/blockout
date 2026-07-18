package com.blockout.notifications.listeners;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.events.application.EventConsumption;
import com.blockout.notifications.followers.application.FollowerProjectionAction;
import com.blockout.notifications.followers.application.FollowerProjectionCommand;
import com.blockout.notifications.followers.application.FollowerProjectionConsumer;
import com.blockout.notifications.followers.inbound.FavoriteV2MessageDecoder;
import com.blockout.notifications.models.enums.EntityType;
import com.blockout.notifications.models.enums.EventType;
import com.blockout.notifications.models.events.UserFollowEvent;
import java.util.Objects;
import org.springframework.amqp.core.Message;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class TeamFollowListener {

    private static final Logger logger = LoggerFactory.getLogger(TeamFollowListener.class);
    private final FollowerProjectionConsumer followerProjection;
    private final FavoriteV2MessageDecoder decoder;
    private final EventConsumption consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.TEAM_FOLLOW_QUEUE_NOTIFICATIONS,
            autoStartup = "${blockout.events.consumers.favorites-v1-enabled:true}",
            ackMode = "AUTO")
    public void onTeamFollowChanged(
            UserFollowEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        logger.info("Received team.follow event",
                keyValue("action", "team_follow_event"),
                keyValue("userId", event.getUserId()),
                keyValue("entityType", event.getEntityType()),
                keyValue("entityId", event.getEntityId()),
                keyValue("eventType", event.getEventType()));

        FollowerProjectionCommand command = legacyCommand(event);
        consumedEvents.processLegacy(eventId, legacyType(event), () -> followerProjection.apply(command));
    }

    @RabbitListener(
            queues = RabbitMQConfig.TEAM_FOLLOW_QUEUE_NOTIFICATIONS_V2,
            autoStartup = "${blockout.events.consumers.favorites-v2-enabled:false}",
            ackMode = "AUTO")
    public void onTeamFavoriteV2(Message message) {
        var decoded = decoder.decodeTeam(message);
        consumedEvents.processV2(
                decoded.eventId(), decoded.eventIdHeader(), decoded.eventType(), () ->
                        followerProjection.apply(decoded.command()));
    }

    private String legacyType(UserFollowEvent event) {
        return event.getEventType() == EventType.CREATED ? "TEAM_FOLLOWED" : "TEAM_UNFOLLOWED";
    }

    private FollowerProjectionCommand legacyCommand(UserFollowEvent event) {
        EventType eventType = Objects.requireNonNull(event.getEventType(), "eventType is required");
        FollowerProjectionAction action = eventType == EventType.CREATED
                ? FollowerProjectionAction.FOLLOW
                : FollowerProjectionAction.UNFOLLOW;
        return new FollowerProjectionCommand(
                event.getUserId(), EntityType.TEAM, event.getEntityId(), action);
    }
}
