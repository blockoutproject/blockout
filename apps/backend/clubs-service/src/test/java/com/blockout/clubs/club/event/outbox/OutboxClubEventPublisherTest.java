package com.blockout.clubs.club.event.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.club.application.ClubEventData;
import com.blockout.clubs.models.events.ClubUpsertEvent;
import com.blockout.events.v2.model.ClubProjectionChangedV2Event;
import com.blockout.events.v2.model.ClubUpsertV2Event;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OutboxClubEventPublisherTest {

    @Test
    void recordsOneClubFactWithSharedV1V2Identity() {
        Recorder recorder = new Recorder();
        ClubEventData club = new ClubEventData(
                "club-1", "Volley Club", "https://logo", "Paris", true, 7L);

        new OutboxClubEventPublisher(recorder, new ClubEventMapper()).publishUpsert(club);

        assertThat(recorder.event.eventType()).isEqualTo("CLUB_UPSERT");
        assertThat(recorder.event.schemaVersion()).isEqualTo("2.0.0");
        assertThat(recorder.event.orderingKey()).isEqualTo("club:club-1");
        assertThat(recorder.event.v1RoutingKey()).isEqualTo("club.upsert");
        assertThat(recorder.event.v2RoutingKey()).isEqualTo("club.upsert.v2");
        assertThat(recorder.event.v1Payload()).isInstanceOf(ClubUpsertEvent.class);
        assertThat(recorder.event.v1Payload().getClass().getName())
                .isEqualTo("com.blockout.clubs.models.events.ClubUpsertEvent");
        ClubUpsertV2Event v2 = (ClubUpsertV2Event) recorder.event.v2Payload();
        assertThat(v2.eventId()).isEqualTo(recorder.metadata.eventId());
        assertThat(v2.payload().name()).isEqualTo("Volley Club");
    }

    @Test
    void recordsTheOwnerProjectionFactAsCanonicalOnlyWithItsPostFlushRevision() {
        Recorder recorder = new Recorder();
        ClubEventData club = new ClubEventData(
                "club-1", "Volley Club", "https://logo", "Paris", false, 7L);

        new OutboxClubEventPublisher(recorder, new ClubEventMapper()).publishProjection(club);

        assertThat(recorder.event.eventType()).isEqualTo("CLUB_PROJECTION_CHANGED");
        assertThat(recorder.event.aggregateVersion()).isEqualTo(7L);
        assertThat(recorder.event.orderingKey()).isEqualTo("club:club-1");
        assertThat(recorder.event.v1Enabled()).isFalse();
        assertThat(recorder.event.v2RoutingKey()).isEqualTo("club.projection-changed.v2");
        ClubProjectionChangedV2Event v2 = (ClubProjectionChangedV2Event) recorder.event.v2Payload();
        assertThat(v2.aggregateVersion()).isEqualTo(7L);
        assertThat(v2.eventId()).isEqualTo(recorder.metadata.eventId());
        assertThat(v2.payload().id()).isEqualTo("club-1");
        assertThat(v2.payload().active()).isFalse();
    }

    private static final class Recorder implements OutboxRecorder {
        private final OutboxMetadata metadata = new OutboxMetadata(
                UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83"),
                OffsetDateTime.parse("2026-07-17T20:00Z"),
                null);
        private OutboxEvent event;

        @Override
        public OutboxMetadata newMetadata() {
            return metadata;
        }

        @Override
        public void record(OutboxEvent event) {
            this.event = event;
        }
    }
}
