package com.blockout.outbox;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

public class OutboxPublisherJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(OutboxPublisherJob.class);

    private final OutboxStore store;
    private final OutboxAmqpPublisher publisher;
    private final OutboxProperties properties;
    private final Clock clock;

    OutboxPublisherJob(
            OutboxStore store,
            OutboxAmqpPublisher publisher,
            OutboxProperties properties,
            Clock clock) {
        this.store = store;
        this.publisher = publisher;
        this.properties = properties;
        this.clock = clock;
    }

    @Scheduled(
            initialDelayString = "${blockout.outbox.initial-delay:2s}",
            fixedDelayString = "${blockout.outbox.fixed-delay:1s}")
    @Transactional
    public void publishReady() {
        if (!properties.isPublisherEnabled()) {
            return;
        }
        var rows = store.claimReady(clock.instant(), properties.getBatchSize());
        int publishedVersions = 0;
        for (OutboxRow row : rows) {
            try {
                if (row.v1PublishedAt() == null) {
                    publisher.publishV1(row);
                    store.markV1Published(row.eventId(), clock.instant());
                    publishedVersions++;
                }
                if (row.v2Enabled() && row.v2PublishedAt() == null) {
                    publisher.publishV2(row);
                    store.markV2Published(row.eventId(), clock.instant());
                    publishedVersions++;
                }
            } catch (Exception exception) {
                int attempt = row.attemptCount() + 1;
                Instant retryAt = clock.instant().plus(backoff(attempt));
                store.markFailure(row.eventId(), attempt, retryAt, safeError(exception));
                LOGGER.warn("Outbox publication failed eventId={} eventType={} attempt={} retryAt={}",
                        row.eventId(), row.eventType(), attempt, retryAt, exception);
            }
        }
        if (!rows.isEmpty()) {
            LOGGER.info("Outbox batch observed claimed={} publishedVersions={} pending={}",
                    rows.size(), publishedVersions, store.countPending());
        }
    }

    @Scheduled(
            initialDelayString = "${blockout.outbox.cleanup-initial-delay:10m}",
            fixedDelayString = "${blockout.outbox.cleanup-delay:1h}")
    @Transactional
    public void cleanupCompleted() {
        int deleted = store.deleteCompletedBefore(clock.instant().minus(properties.getRetention()));
        if (deleted > 0) {
            LOGGER.info("Completed outbox rows removed count={} retention={}", deleted, properties.getRetention());
        }
    }

    private Duration backoff(int attempt) {
        return Duration.ofSeconds(Math.min(60, 1L << Math.min(attempt, 6)));
    }

    private String safeError(Exception exception) {
        String message = exception.getClass().getSimpleName() + ": " + String.valueOf(exception.getMessage());
        message = message.replace('\n', ' ').replace('\r', ' ');
        return message.length() <= 500 ? message : message.substring(0, 500);
    }
}
