package com.blockout.outbox;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OutboxWriterTest {

    private static final Instant NOW = Instant.parse("2026-07-17T20:00:00Z");

    @Test
    void recordsLegacySnakeCaseAndCanonicalCamelCaseInOneRow() {
        RecordingStore store = new RecordingStore();
        ObjectMapper mapper = new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        OutboxWriter writer = new OutboxWriter(store, mapper, Clock.fixed(NOW, ZoneOffset.UTC));
        OutboxMetadata metadata = new OutboxMetadata(
                UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83"),
                OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC),
                "correlation-1");

        writer.record(event(metadata, new SamplePayload("Volley Club"), "club.upsert.v2",
                new SamplePayload("Volley Club")));

        assertThat(store.v1Json).isEqualTo("{\"display_name\":\"Volley Club\"}");
        assertThat(store.v2Json).isEqualTo("{\"displayName\":\"Volley Club\"}");
        assertThat(store.event.metadata()).isSameAs(metadata);
    }

    @Test
    void createsOneUtcIdentityFromTheServiceClock() {
        OutboxWriter writer = new OutboxWriter(new RecordingStore(), new ObjectMapper(),
                Clock.fixed(NOW, ZoneOffset.UTC));

        OutboxMetadata metadata = writer.newMetadata();

        assertThat(metadata.eventId()).isNotNull();
        assertThat(metadata.occurredAt()).isEqualTo(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
        assertThat(metadata.correlationId()).isNull();
    }

    @Test
    void rejectsHalfConfiguredV2AndNegativeAggregateVersions() {
        OutboxMetadata metadata = new OutboxMetadata(UUID.randomUUID(), OffsetDateTime.now(), null);

        assertThatThrownBy(() -> event(metadata, new SamplePayload("legacy"), "club.upsert.v2", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("v2 route and payload");
        assertThatThrownBy(() -> new OutboxEvent(
                metadata, "CLUB_UPSERT", "2.0.0", "clubs-service", "club:1", -1L,
                "entity.lifecycle.exchange", "club.upsert", new SamplePayload("legacy"), null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("aggregateVersion");
    }

    private OutboxEvent event(
            OutboxMetadata metadata, Object v1Payload, String v2Route, Object v2Payload) {
        return new OutboxEvent(
                metadata, "CLUB_UPSERT", "2.0.0", "clubs-service", "club:1", null,
                "entity.lifecycle.exchange", "club.upsert", v1Payload, v2Route, v2Payload);
    }

    private record SamplePayload(String displayName) {
    }

    private static final class RecordingStore implements OutboxStore {
        private OutboxEvent event;
        private String v1Json;
        private String v2Json;

        @Override
        public void insert(OutboxEvent event, String v1Json, String v2Json) {
            this.event = event;
            this.v1Json = v1Json;
            this.v2Json = v2Json;
        }

        @Override
        public List<OutboxRow> claimReady(Instant now, int batchSize) {
            return List.of();
        }

        @Override
        public void markV1Published(UUID eventId, Instant publishedAt) {
        }

        @Override
        public void markV2Published(UUID eventId, Instant publishedAt) {
        }

        @Override
        public void markFailure(UUID eventId, int attemptCount, Instant nextAttemptAt, String error) {
        }

        @Override
        public long countPending() {
            return 0;
        }

        @Override
        public int deleteCompletedBefore(Instant cutoff) {
            return 0;
        }
    }
}
