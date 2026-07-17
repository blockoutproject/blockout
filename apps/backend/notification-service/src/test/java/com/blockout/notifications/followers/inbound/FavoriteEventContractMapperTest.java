package com.blockout.notifications.followers.inbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolFollowV2Payload;
import com.blockout.events.v2.model.PoolUnfollowedV2Event;
import com.blockout.events.v2.model.TeamFollowV2Payload;
import com.blockout.events.v2.model.TeamFollowedV2Event;
import com.blockout.notifications.followers.application.FollowerProjectionAction;
import com.blockout.notifications.models.enums.EntityType;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FavoriteEventContractMapperTest {

    private static final UUID EVENT_ID = UUID.fromString("00000000-0000-4000-8000-000000000369");
    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T13:00:00Z");
    private final FavoriteEventContractMapper mapper = new FavoriteEventContractMapper();

    @Test
    void mapsGeneratedTeamAndPoolEventsToApplicationCommands() {
        var team = mapper.fromTeamFollowed(teamEvent(EventType.TEAM_FOLLOWED, "user:7:team:2", 7L, 2L));
        var pool = mapper.fromPoolUnfollowed(poolEvent(EventType.POOL_UNFOLLOWED, "user:7:pool:4", 7L, 4L));

        assertThat(team.userId()).isEqualTo(7L);
        assertThat(team.entityType()).isEqualTo(EntityType.TEAM);
        assertThat(team.entityId()).isEqualTo(2L);
        assertThat(team.action()).isEqualTo(FollowerProjectionAction.FOLLOW);
        assertThat(pool.entityType()).isEqualTo(EntityType.POOL);
        assertThat(pool.action()).isEqualTo(FollowerProjectionAction.UNFOLLOW);
    }

    @Test
    void rejectsRouteTypeOrderingVersionAndIdentifierContradictions() {
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromTeamFollowed(teamEvent(EventType.POOL_FOLLOWED, "user:7:team:2", 7L, 2L)));
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromTeamFollowed(teamEvent(EventType.TEAM_FOLLOWED, "user:7:team:3", 7L, 2L)));
        assertThatIllegalArgumentException().isThrownBy(() -> mapper.fromTeamFollowed(new TeamFollowedV2Event(
                null,
                null,
                EVENT_ID,
                EventType.TEAM_FOLLOWED,
                OCCURRED_AT,
                "user:7:team:2",
                new TeamFollowV2Payload(2L, 7L),
                "users-service",
                "3.0.0")));
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromTeamFollowed(teamEvent(EventType.TEAM_FOLLOWED, "user:0:team:2", 0L, 2L)));
    }

    private TeamFollowedV2Event teamEvent(EventType type, String orderingKey, Long userId, Long teamId) {
        return new TeamFollowedV2Event(
                null,
                "workflow-7",
                EVENT_ID,
                type,
                OCCURRED_AT,
                orderingKey,
                new TeamFollowV2Payload(teamId, userId),
                "users-service",
                "2.0.0");
    }

    private PoolUnfollowedV2Event poolEvent(EventType type, String orderingKey, Long userId, Long poolId) {
        return new PoolUnfollowedV2Event(
                null,
                "workflow-7",
                EVENT_ID,
                type,
                OCCURRED_AT,
                orderingKey,
                new PoolFollowV2Payload(poolId, userId),
                "users-service",
                "2.0.0");
    }
}
