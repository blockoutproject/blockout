package com.blockout.users.favorite.outbound;

import com.blockout.shared.model.FavoriteEventActionEnum;
import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolFollowV2Payload;
import com.blockout.events.v2.model.PoolFollowedV2Event;
import com.blockout.events.v2.model.PoolUnfollowedV2Event;
import com.blockout.events.v2.model.TeamFollowV2Payload;
import com.blockout.events.v2.model.TeamFollowedV2Event;
import com.blockout.events.v2.model.TeamUnfollowedV2Event;
import com.blockout.users.favorite.application.FavoriteEventFact;
import com.blockout.users.favorite.application.FavoriteEventMetadata;
import com.blockout.shared.model.EntityTypeEnum;
import org.springframework.stereotype.Component;

/** Maps favorite application facts to generated v2 records without publishing them before MRG-372. */
@Component
public class FavoriteEventContractMapper {

    private static final String PRODUCER = "users-service";
    private static final String SCHEMA_VERSION = "2.0.0";

    public TeamFollowedV2Event toTeamFollowed(FavoriteEventFact fact, FavoriteEventMetadata metadata) {
        require(fact, EntityTypeEnum.TEAM, FavoriteEventActionEnum.FOLLOWED);
        return new TeamFollowedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.TEAM_FOLLOWED,
                metadata.occurredAt(),
                orderingKey(fact),
                new TeamFollowV2Payload(fact.entityId(), fact.userId()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    public TeamUnfollowedV2Event toTeamUnfollowed(FavoriteEventFact fact, FavoriteEventMetadata metadata) {
        require(fact, EntityTypeEnum.TEAM, FavoriteEventActionEnum.UNFOLLOWED);
        return new TeamUnfollowedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.TEAM_UNFOLLOWED,
                metadata.occurredAt(),
                orderingKey(fact),
                new TeamFollowV2Payload(fact.entityId(), fact.userId()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    public PoolFollowedV2Event toPoolFollowed(FavoriteEventFact fact, FavoriteEventMetadata metadata) {
        require(fact, EntityTypeEnum.POOL, FavoriteEventActionEnum.FOLLOWED);
        return new PoolFollowedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.POOL_FOLLOWED,
                metadata.occurredAt(),
                orderingKey(fact),
                new PoolFollowV2Payload(fact.entityId(), fact.userId()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    public PoolUnfollowedV2Event toPoolUnfollowed(FavoriteEventFact fact, FavoriteEventMetadata metadata) {
        require(fact, EntityTypeEnum.POOL, FavoriteEventActionEnum.UNFOLLOWED);
        return new PoolUnfollowedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.POOL_UNFOLLOWED,
                metadata.occurredAt(),
                orderingKey(fact),
                new PoolFollowV2Payload(fact.entityId(), fact.userId()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    private String orderingKey(FavoriteEventFact fact) {
        return "user:%d:%s:%d".formatted(
                fact.userId(), fact.entityType().name().toLowerCase(), fact.entityId());
    }

    private void require(FavoriteEventFact fact, EntityTypeEnum expectedType, FavoriteEventActionEnum expectedAction) {
        if (fact.entityType() != expectedType || fact.action() != expectedAction) {
            throw new IllegalArgumentException(
                    "Expected " + expectedType + " " + expectedAction + " favorite fact");
        }
    }
}
