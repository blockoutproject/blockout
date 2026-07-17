package com.blockout.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OutboxPublisherJobTest {

    private static final Instant NOW = Instant.parse("2026-07-17T20:00:00Z");
    private static final UUID EVENT_ID = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");

    @Test
    void publishesOnlyTheMissingVersionAndKeepsIndependentState() {
        RecordingStore store = new RecordingStore(List.of(row(NOW.minusSeconds(5), true, null, 0)));
        RecordingPublisher publisher = new RecordingPublisher();

        job(store, publisher, properties(true)).publishReady();

        assertThat(publisher.v1Ids).isEmpty();
        assertThat(publisher.v2Ids).containsExactly(EVENT_ID);
        assertThat(store.v1PublishedIds).isEmpty();
        assertThat(store.v2PublishedIds).containsExactly(EVENT_ID);
    }

    @Test
    void recordsV1BeforeRetryingAFailedV2WithTheSameIdentity() {
        RecordingStore store = new RecordingStore(List.of(row(null, true, null, 2)));
        RecordingPublisher publisher = new RecordingPublisher();
        publisher.failV2 = true;

        job(store, publisher, properties(true)).publishReady();

        assertThat(publisher.v1Ids).containsExactly(EVENT_ID);
        assertThat(store.v1PublishedIds).containsExactly(EVENT_ID);
        assertThat(store.failureEventId).isEqualTo(EVENT_ID);
        assertThat(store.failureAttempt).isEqualTo(3);
        assertThat(store.failureRetryAt).isEqualTo(NOW.plusSeconds(8));
        assertThat(store.failureError).isEqualTo("IllegalStateException: broker unavailable");
        assertThat(store.v2PublishedIds).isEmpty();
    }

    @Test
    void pauseSwitchPreventsClaimsAndCleanupHonorsRetention() {
        RecordingStore store = new RecordingStore(List.of());
        RecordingPublisher publisher = new RecordingPublisher();
        OutboxProperties paused = properties(false);
        paused.setRetention(Duration.ofDays(3));
        OutboxPublisherJob job = job(store, publisher, paused);

        job.publishReady();
        job.cleanupCompleted();

        assertThat(store.claimCount).isZero();
        assertThat(store.cleanupCutoff).isEqualTo(NOW.minus(Duration.ofDays(3)));
    }

    private OutboxPublisherJob job(
            OutboxStore store, OutboxAmqpPublisher publisher, OutboxProperties properties) {
        return new OutboxPublisherJob(store, publisher, properties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private OutboxProperties properties(boolean enabled) {
        OutboxProperties properties = new OutboxProperties();
        properties.setPublisherEnabled(enabled);
        return properties;
    }

    private OutboxRow row(Instant v1PublishedAt, boolean v2Enabled, Instant v2PublishedAt, int attempts) {
        return new OutboxRow(
                EVENT_ID, "CLUB_UPSERT", "2.0.0", "clubs-service", "club:1", null, null, NOW,
                "entity.lifecycle.exchange", "club.upsert", "{}", Object.class.getName(), v1PublishedAt,
                v2Enabled, "club.upsert.v2", "{}", v2PublishedAt, attempts);
    }

    private static final class RecordingPublisher extends OutboxAmqpPublisher {
        private final List<UUID> v1Ids = new ArrayList<>();
        private final List<UUID> v2Ids = new ArrayList<>();
        private boolean failV2;

        private RecordingPublisher() {
            super(null, new ObjectMapper());
        }

        @Override
        void publishV1(OutboxRow row) {
            v1Ids.add(row.eventId());
        }

        @Override
        void publishV2(OutboxRow row) {
            v2Ids.add(row.eventId());
            if (failV2) {
                throw new IllegalStateException("broker unavailable");
            }
        }
    }

    private static final class RecordingStore implements OutboxStore {
        private final List<OutboxRow> rows;
        private final List<UUID> v1PublishedIds = new ArrayList<>();
        private final List<UUID> v2PublishedIds = new ArrayList<>();
        private int claimCount;
        private UUID failureEventId;
        private int failureAttempt;
        private Instant failureRetryAt;
        private String failureError;
        private Instant cleanupCutoff;

        private RecordingStore(List<OutboxRow> rows) {
            this.rows = rows;
        }

        @Override
        public void insert(OutboxEvent event, String v1Json, String v2Json) {
        }

        @Override
        public List<OutboxRow> claimReady(Instant now, int batchSize) {
            claimCount++;
            return rows;
        }

        @Override
        public void markV1Published(UUID eventId, Instant publishedAt) {
            v1PublishedIds.add(eventId);
        }

        @Override
        public void markV2Published(UUID eventId, Instant publishedAt) {
            v2PublishedIds.add(eventId);
        }

        @Override
        public void markFailure(UUID eventId, int attemptCount, Instant nextAttemptAt, String error) {
            failureEventId = eventId;
            failureAttempt = attemptCount;
            failureRetryAt = nextAttemptAt;
            failureError = error;
        }

        @Override
        public long countPending() {
            return rows.size();
        }

        @Override
        public int deleteCompletedBefore(Instant cutoff) {
            cleanupCutoff = cutoff;
            return 0;
        }
    }
}
