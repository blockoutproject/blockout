package com.blockout.competitions.services;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EventPublisherTest {

    @Test
    void recordsThreeDualVersionFactsAndKeepsTheOrphanRouteV1Only() {
        Recorder recorder = new Recorder();
        EventPublisher publisher = new EventPublisher(recorder);

        publisher.publishClubDeactivation("club-1");
        publisher.publishTeamDeactivation(12L);
        publisher.publishPoolDeactivation(42L);
        publisher.publishTeamDeactivationByPool(12L, 42L);

        assertThat(recorder.events)
                .extracting(OutboxEvent::v1RoutingKey)
                .containsExactly("club.deactivation", "team.deactivation", "pool.deactivation",
                        "teambypool.deactivation");
        assertThat(recorder.events.subList(0, 3))
                .allSatisfy(event -> {
                    assertThat(event.v2Enabled()).isTrue();
                    assertThat(event.v2RoutingKey()).endsWith(".v2");
                    assertThat(event.v2Payload()).extracting("eventId").isEqualTo(event.metadata().eventId());
                });
        OutboxEvent orphan = recorder.events.get(3);
        assertThat(orphan.v2Enabled()).isFalse();
        assertThat(orphan.orderingKey()).isEqualTo("pool:42:team:12");
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
