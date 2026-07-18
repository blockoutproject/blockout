package com.blockout.pools.pool.event.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.pools.models.events.PoolUpsertEvent;
import com.blockout.pools.pool.application.PoolUpsertFact;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OutboxPoolEventPublisherTest {

    @Test
    void recordsOnePoolFactWithSharedV1V2Identity() {
        Recorder recorder = new Recorder();
        PoolUpsertFact pool = new PoolUpsertFact(
                42L, "Pool A", "A", 8L, "LNV", "League", "2026", FormatEnum.SIX, GenderEnum.F);

        new OutboxPoolEventPublisher(recorder, new PoolEventMapper()).publishUpsert(pool);

        assertThat(recorder.event.eventType()).isEqualTo("POOL_UPSERT");
        assertThat(recorder.event.orderingKey()).isEqualTo("pool:42");
        assertThat(recorder.event.v1RoutingKey()).isEqualTo("pool.upsert");
        assertThat(recorder.event.v2RoutingKey()).isEqualTo("pool.upsert.v2");
        assertThat(recorder.event.v1Payload()).isInstanceOf(PoolUpsertEvent.class);
        assertThat(recorder.event.v1Payload().getClass().getName())
                .isEqualTo("com.blockout.pools.models.events.PoolUpsertEvent");
        PoolUpsertV2Event v2 = (PoolUpsertV2Event) recorder.event.v2Payload();
        assertThat(v2.eventId()).isEqualTo(recorder.metadata.eventId());
        assertThat(v2.payload().leagueCode()).isEqualTo("LNV");
        assertThat(v2.payload().gender()).isEqualTo("F");
    }

    @Test
    void preservesNullableLegacyAndCanonicalEnums() {
        Recorder recorder = new Recorder();
        PoolUpsertFact pool = new PoolUpsertFact(
                42L, "Pool A", "A", 8L, "LNV", "League", "2026", null, null);

        new OutboxPoolEventPublisher(recorder, new PoolEventMapper()).publishUpsert(pool);

        PoolUpsertEvent v1 = (PoolUpsertEvent) recorder.event.v1Payload();
        PoolUpsertV2Event v2 = (PoolUpsertV2Event) recorder.event.v2Payload();
        assertThat(v1.getFormat()).isNull();
        assertThat(v1.getGender()).isNull();
        assertThat(v2.payload().format()).isNull();
        assertThat(v2.payload().gender()).isNull();
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
