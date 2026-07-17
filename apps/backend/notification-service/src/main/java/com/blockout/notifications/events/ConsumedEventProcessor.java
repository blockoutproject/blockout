package com.blockout.notifications.events;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Runs one migrated side effect and its event marker in the same database transaction. */
@Service
public class ConsumedEventProcessor {

    private static final Logger logger = LoggerFactory.getLogger(ConsumedEventProcessor.class);
    private final ConsumedEventStore store;

    ConsumedEventProcessor(ConsumedEventStore store) {
        this.store = store;
    }

    @Transactional
    public void processLegacy(String eventIdHeader, String eventType, Runnable sideEffect) {
        if (eventIdHeader == null) {
            logger.info("Processing legacy event without deduplication marker",
                    keyValue("action", "legacy_event_without_id"),
                    keyValue("eventType", eventType));
            sideEffect.run();
            return;
        }
        process(UUID.fromString(eventIdHeader), eventType, "v1", sideEffect);
    }

    @Transactional
    public void processV2(UUID bodyEventId, String eventIdHeader, String eventType, Runnable sideEffect) {
        UUID headerEventId = UUID.fromString(eventIdHeader);
        if (!bodyEventId.equals(headerEventId)) {
            throw new IllegalArgumentException("V2 body eventId does not match x-blockout-event-id");
        }
        process(bodyEventId, eventType, "v2", sideEffect);
    }

    private void process(UUID eventId, String eventType, String wireVersion, Runnable sideEffect) {
        if (!store.tryRecord(eventId, eventType, wireVersion)) {
            logger.info("Skipping already consumed event",
                    keyValue("action", "consumed_event_duplicate"),
                    keyValue("eventId", eventId),
                    keyValue("eventType", eventType),
                    keyValue("wireVersion", wireVersion));
            return;
        }
        sideEffect.run();
        logger.info("Recorded consumed event",
                keyValue("action", "consumed_event_recorded"),
                keyValue("eventId", eventId),
                keyValue("eventType", eventType),
                keyValue("wireVersion", wireVersion));
    }
}
