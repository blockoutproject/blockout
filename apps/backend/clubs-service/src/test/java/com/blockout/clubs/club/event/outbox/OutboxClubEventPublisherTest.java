package com.blockout.clubs.club.event.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.club.application.ClubUpsertFact;
import com.blockout.clubs.models.events.ClubUpsertEvent;
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
        ClubUpsertFact club = new ClubUpsertFact("club-1", "Volley Club", "https://logo", "Paris");

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
