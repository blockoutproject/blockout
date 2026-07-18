package com.blockout.users.favorite.outbound;

import com.blockout.shared.model.FavoriteEventActionEnum;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.events.v2.model.EventType;
import com.blockout.users.favorite.application.FavoriteEventFact;
import com.blockout.users.favorite.application.FavoriteEventMetadata;
import com.blockout.shared.model.EntityTypeEnum;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FavoriteEventContractMapperTest {

    private static final UUID EVENT_ID = UUID.fromString("00000000-0000-4000-8000-000000000369");
    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T13:00:00Z");
    private final FavoriteEventContractMapper mapper = new FavoriteEventContractMapper();
    private final FavoriteEventMetadata metadata = new FavoriteEventMetadata(EVENT_ID, OCCURRED_AT, "workflow-7");

    @Test
    void mapsTeamFollowToTheGeneratedEnvelope() {
        var event = mapper.toTeamFollowed(
                new FavoriteEventFact(7L, EntityTypeEnum.TEAM, 2L, FavoriteEventActionEnum.FOLLOWED),
                metadata);

        assertThat(event.eventId()).isEqualTo(EVENT_ID);
        assertThat(event.eventType()).isEqualTo(EventType.TEAM_FOLLOWED);
        assertThat(event.payload().userId()).isEqualTo(7L);
        assertThat(event.payload().teamId()).isEqualTo(2L);
        assertThat(event.orderingKey()).isEqualTo("user:7:team:2");
        assertThat(event.producer()).isEqualTo("users-service");
        assertThat(event.schemaVersion()).isEqualTo("2.0.0");
        assertThat(event.aggregateVersion()).isNull();
    }

    @Test
    void mapsPoolUnfollowToTheGeneratedEnvelope() {
        var event = mapper.toPoolUnfollowed(
                new FavoriteEventFact(7L, EntityTypeEnum.POOL, 4L, FavoriteEventActionEnum.UNFOLLOWED),
                metadata);

        assertThat(event.eventType()).isEqualTo(EventType.POOL_UNFOLLOWED);
        assertThat(event.payload().userId()).isEqualTo(7L);
        assertThat(event.payload().poolId()).isEqualTo(4L);
        assertThat(event.orderingKey()).isEqualTo("user:7:pool:4");
    }

    @Test
    void rejectsNonPositiveIdentifiersAndRouteContradictions() {
        assertThatIllegalArgumentException().isThrownBy(() ->
                new FavoriteEventFact(0L, EntityTypeEnum.TEAM, 2L, FavoriteEventActionEnum.FOLLOWED));
        assertThatIllegalArgumentException().isThrownBy(() -> mapper.toPoolFollowed(
                new FavoriteEventFact(7L, EntityTypeEnum.TEAM, 2L, FavoriteEventActionEnum.FOLLOWED),
                metadata));
    }
}
