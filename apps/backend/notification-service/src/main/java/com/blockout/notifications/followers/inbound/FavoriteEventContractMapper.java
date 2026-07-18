package com.blockout.notifications.followers.inbound;

import com.blockout.shared.model.FollowerProjectionActionEnum;
import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolFollowedV2Event;
import com.blockout.events.v2.model.PoolUnfollowedV2Event;
import com.blockout.events.v2.model.TeamFollowedV2Event;
import com.blockout.events.v2.model.TeamUnfollowedV2Event;
import com.blockout.notifications.followers.application.FollowerProjectionCommand;
import com.blockout.shared.model.EntityTypeEnum;
import org.springframework.stereotype.Component;

/** Validates generated v2 records and maps them immediately to application projection commands. */
@Component
public class FavoriteEventContractMapper {

    private static final String PRODUCER = "users-service";
    private static final String SCHEMA_VERSION = "2.0.0";

    public FollowerProjectionCommand fromTeamFollowed(TeamFollowedV2Event event) {
        requireEnvelope(event.eventId(), event.occurredAt(), event.producer(), event.schemaVersion());
        var command = new FollowerProjectionCommand(
                event.payload().userId(),
                EntityTypeEnum.TEAM,
                event.payload().teamId(),
                requireType(event.eventType(), EventType.TEAM_FOLLOWED, FollowerProjectionActionEnum.FOLLOW));
        requireOrderingKey(event.orderingKey(), command);
        return command;
    }

    public FollowerProjectionCommand fromTeamUnfollowed(TeamUnfollowedV2Event event) {
        requireEnvelope(event.eventId(), event.occurredAt(), event.producer(), event.schemaVersion());
        var command = new FollowerProjectionCommand(
                event.payload().userId(),
                EntityTypeEnum.TEAM,
                event.payload().teamId(),
                requireType(event.eventType(), EventType.TEAM_UNFOLLOWED, FollowerProjectionActionEnum.UNFOLLOW));
        requireOrderingKey(event.orderingKey(), command);
        return command;
    }

    public FollowerProjectionCommand fromPoolFollowed(PoolFollowedV2Event event) {
        requireEnvelope(event.eventId(), event.occurredAt(), event.producer(), event.schemaVersion());
        var command = new FollowerProjectionCommand(
                event.payload().userId(),
                EntityTypeEnum.POOL,
                event.payload().poolId(),
                requireType(event.eventType(), EventType.POOL_FOLLOWED, FollowerProjectionActionEnum.FOLLOW));
        requireOrderingKey(event.orderingKey(), command);
        return command;
    }

    public FollowerProjectionCommand fromPoolUnfollowed(PoolUnfollowedV2Event event) {
        requireEnvelope(event.eventId(), event.occurredAt(), event.producer(), event.schemaVersion());
        var command = new FollowerProjectionCommand(
                event.payload().userId(),
                EntityTypeEnum.POOL,
                event.payload().poolId(),
                requireType(event.eventType(), EventType.POOL_UNFOLLOWED, FollowerProjectionActionEnum.UNFOLLOW));
        requireOrderingKey(event.orderingKey(), command);
        return command;
    }

    private FollowerProjectionActionEnum requireType(
            EventType actual, EventType expected, FollowerProjectionActionEnum action) {
        if (actual != expected) {
            throw new IllegalArgumentException("Unexpected favorite eventType: " + actual);
        }
        return action;
    }

    private void requireEnvelope(Object eventId, Object occurredAt, String producer, String schemaVersion) {
        if (eventId == null || occurredAt == null) {
            throw new IllegalArgumentException("Favorite event identity and occurrence time are required");
        }
        if (!PRODUCER.equals(producer)) {
            throw new IllegalArgumentException("Unexpected favorite event producer: " + producer);
        }
        if (!SCHEMA_VERSION.equals(schemaVersion)) {
            throw new IllegalArgumentException("Unsupported favorite schemaVersion: " + schemaVersion);
        }
    }

    private void requireOrderingKey(String actual, FollowerProjectionCommand command) {
        String expected = "user:%d:%s:%d".formatted(
                command.userId(), command.entityType().name().toLowerCase(), command.entityId());
        if (!expected.equals(actual)) {
            throw new IllegalArgumentException("Favorite orderingKey does not match its payload");
        }
    }
}
