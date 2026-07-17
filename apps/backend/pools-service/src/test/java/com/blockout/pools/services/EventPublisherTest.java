package com.blockout.pools.services;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.pools.pool.application.PoolView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EventPublisherTest {

    @Test
    void recordsOnePoolFactWithSharedV1V2Identity() {
        Recorder recorder = new Recorder();
        PoolView pool = new PoolView(
                42L, "P-42", "LNV", "2026", "League", "raw", "Pool A", "A", 8L,
                FormatEnum.SIX, GenderEnum.F, 4L, true, null, null);

        new EventPublisher(recorder).publishUpsert(pool);

        assertThat(recorder.event.eventType()).isEqualTo("POOL_UPSERT");
        assertThat(recorder.event.orderingKey()).isEqualTo("pool:42");
        assertThat(recorder.event.v1RoutingKey()).isEqualTo("pool.upsert");
        assertThat(recorder.event.v2RoutingKey()).isEqualTo("pool.upsert.v2");
        PoolUpsertV2Event v2 = (PoolUpsertV2Event) recorder.event.v2Payload();
        assertThat(v2.eventId()).isEqualTo(recorder.metadata.eventId());
        assertThat(v2.payload().leagueCode()).isEqualTo("LNV");
        assertThat(v2.payload().gender()).isEqualTo("F");
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
