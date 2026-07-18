package com.blockout.outbox;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

/** Runs one event side effect and its service-local receipt in the same transaction. */
public class ConsumedEventProcessor {

    private static final Logger logger = LoggerFactory.getLogger(ConsumedEventProcessor.class);
    private final ConsumedEventStore store;

    ConsumedEventProcessor(ConsumedEventStore store) {
        this.store = store;
    }

    @Transactional
    public void processLegacy(String eventIdHeader, String eventType, Runnable sideEffect) {
        if (eventIdHeader == null) {
            logger.info("Processing legacy event without a deduplication marker: {}", eventType);
            sideEffect.run();
            return;
        }
        process(UUID.fromString(eventIdHeader), eventType, "v1", sideEffect);
    }

    @Transactional
    public void processV2(UUID eventId, String eventType, Runnable sideEffect) {
        process(eventId, eventType, "v2", sideEffect);
    }

    private void process(UUID eventId, String eventType, String wireVersion, Runnable sideEffect) {
        if (!store.tryRecord(eventId, eventType, wireVersion)) {
            logger.info("Skipping already consumed {} event {}", eventType, eventId);
            return;
        }
        sideEffect.run();
        logger.info("Recorded consumed {} event {} over {}", eventType, eventId, wireVersion);
    }
}
