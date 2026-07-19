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
public class TeamFollowListener {

    private static final Logger logger = LoggerFactory.getLogger(TeamFollowListener.class);
    private final FollowersProjectionApplicationService followersProjectionService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_FOLLOW_QUEUE_NOTIFICATIONS)
    public void onTeamFollowChanged(UserFollowEvent event) {
        logger.info("Received team.follow event",
                keyValue("action", "team_follow_event"),
                keyValue("userId", event.getUserId()),
                keyValue("entityType", event.getEntityType()),
                keyValue("entityId", event.getEntityId()),
                keyValue("eventType", event.getEventType()));

        if (event.getEventType() == EventType.CREATED) {
            followersProjectionService.followTeam(event.getUserId(), event.getEntityId());
            logger.info("Projection updated (FOLLOW team)",
                    keyValue("action", "followers_projection_upsert_team"),
                    keyValue("userId", event.getUserId()),
                    keyValue("teamId", event.getEntityId()));
        } else if (event.getEventType() == EventType.DELETED) {
            followersProjectionService.unfollowTeam(event.getUserId(), event.getEntityId());
            logger.info("Projection updated (UNFOLLOW team)",
                    keyValue("action", "followers_projection_delete_team"),
                    keyValue("userId", event.getUserId()),
                    keyValue("teamId", event.getEntityId()));
        }
    }
}
