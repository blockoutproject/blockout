package com.blockout.users.favorite.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.events.v2.model.PoolUnfollowedV2Event;
import com.blockout.events.v2.model.TeamFollowedV2Event;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.shared.model.EntityTypeEnum;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FavoriteOutboxEventPublisherTest {

    @Test
    void recordsFavoriteAndAccountDeletionFactsWithSharedV1V2Identity() {
        Recorder recorder = new Recorder();
        FavoriteOutboxEventPublisher publisher =
                new FavoriteOutboxEventPublisher(recorder, new FavoriteEventContractMapper());

        publisher.publishCreated(10L, EntityTypeEnum.TEAM, 20L);
        publisher.publishFavoriteDeleted(11L, EntityTypeEnum.POOL, 21L);

        assertThat(recorder.events).extracting(OutboxEvent::eventType)
                .containsExactly("TEAM_FOLLOWED", "POOL_UNFOLLOWED");
        assertThat(recorder.events).extracting(OutboxEvent::v1RoutingKey)
                .containsExactly("team.follow", "pool.follow");
        assertThat(recorder.events).extracting(OutboxEvent::v2RoutingKey)
                .containsExactly("team.follow.v2", "pool.follow.v2");
        TeamFollowedV2Event team = (TeamFollowedV2Event) recorder.events.getFirst().v2Payload();
        PoolUnfollowedV2Event pool = (PoolUnfollowedV2Event) recorder.events.getLast().v2Payload();
        assertThat(team.eventId()).isEqualTo(recorder.events.getFirst().metadata().eventId());
        assertThat(pool.eventId()).isEqualTo(recorder.events.getLast().metadata().eventId());
        assertThat(team.orderingKey()).isEqualTo("user:10:team:20");
        assertThat(pool.orderingKey()).isEqualTo("user:11:pool:21");
    }

    private static final class Recorder implements OutboxRecorder {
        private final List<OutboxEvent> events = new ArrayList<>();

        @Override
        public OutboxMetadata newMetadata() {
            return new OutboxMetadata(UUID.randomUUID(), OffsetDateTime.parse("2026-07-17T20:00Z"), null);
        }

        @Override
        public void record(OutboxEvent event) {
            events.add(event);
        }
    }
}
