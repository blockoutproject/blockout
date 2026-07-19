package com.blockout.teams.team.event.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.events.v2.model.TeamProjectionChangedV2Event;
import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.models.events.TeamUpsertEvent;
import com.blockout.teams.team.application.TeamEventData;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OutboxTeamEventPublisherTest {

    @Test
    void recordsOneTeamFactWithSharedV1V2Identity() {
        Recorder recorder = new Recorder();
        TeamEventData team = new TeamEventData(
                12L, "First Team", "A", "club-1", 8L, FormatEnum.SIX, GenderEnum.M,
                "2026", "https://logo", true, 7L);

        new OutboxTeamEventPublisher(recorder, new TeamEventMapper()).publishUpsert(team);

        assertThat(recorder.event.eventType()).isEqualTo("TEAM_UPSERT");
        assertThat(recorder.event.orderingKey()).isEqualTo("team:12");
        assertThat(recorder.event.v1RoutingKey()).isEqualTo("team.upsert");
        assertThat(recorder.event.v2RoutingKey()).isEqualTo("team.upsert.v2");
        assertThat(recorder.event.v1Payload()).isInstanceOf(TeamUpsertEvent.class);
        assertThat(recorder.event.v1Payload().getClass().getName())
                .isEqualTo("com.blockout.teams.models.events.TeamUpsertEvent");
        TeamUpsertV2Event v2 = (TeamUpsertV2Event) recorder.event.v2Payload();
        assertThat(v2.eventId()).isEqualTo(recorder.metadata.eventId());
        assertThat(v2.payload().clubId()).isEqualTo("club-1");
        assertThat(v2.payload().format()).isEqualTo("SIX");
    }

    @Test
    void recordsTheOwnerProjectionFactAsCanonicalOnlyWithItsPostFlushRevision() {
        Recorder recorder = new Recorder();
        TeamEventData team = new TeamEventData(
                12L, "First Team", "A", "club-1", 8L, FormatEnum.SIX, GenderEnum.M,
                "2026", "https://logo", false, 7L);

        new OutboxTeamEventPublisher(recorder, new TeamEventMapper()).publishProjection(team);

        assertThat(recorder.event.eventType()).isEqualTo("TEAM_PROJECTION_CHANGED");
        assertThat(recorder.event.aggregateVersion()).isEqualTo(7L);
        assertThat(recorder.event.orderingKey()).isEqualTo("team:12");
        assertThat(recorder.event.v1Enabled()).isFalse();
        assertThat(recorder.event.v2RoutingKey()).isEqualTo("team.projection-changed.v2");
        TeamProjectionChangedV2Event v2 = (TeamProjectionChangedV2Event) recorder.event.v2Payload();
        assertThat(v2.aggregateVersion()).isEqualTo(7L);
        assertThat(v2.eventId()).isEqualTo(recorder.metadata.eventId());
        assertThat(v2.payload().id()).isEqualTo(12L);
        assertThat(v2.payload().clubId()).isEqualTo("club-1");
        assertThat(v2.payload().active()).isFalse();
    }

    private static final class Recorder implements OutboxRecorder {
        private final OutboxMetadata metadata = new OutboxMetadata(
                UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83"), OffsetDateTime.parse("2026-07-17T20:00Z"), null);
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
