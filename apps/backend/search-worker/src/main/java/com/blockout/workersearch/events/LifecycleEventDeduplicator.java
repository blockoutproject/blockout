package com.blockout.workersearch.events;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Persistent exact-event guard shared by the v1 and v2 adapters.
 *
 * <p>The bounded local registry closes concurrent overlap, while Elasticsearch receipts survive the restart used to
 * switch listener flags. MRG-429 still owns ordering/version protection and reconciliation.</p>
 */
@Component
public class LifecycleEventDeduplicator {

    private static final Logger logger = LoggerFactory.getLogger(LifecycleEventDeduplicator.class);
    private static final int MAX_EVENT_IDS = 100_000;
    private final Map<UUID, Boolean> eventIds = new LinkedHashMap<>();
    private final LifecycleEventReceiptStore receiptStore;

    public LifecycleEventDeduplicator(LifecycleEventReceiptStore receiptStore) {
        this.receiptStore = receiptStore;
    }

    public UUID legacyEventId(Object header) {
        return header == null ? null : UUID.fromString(header.toString());
    }

    public synchronized boolean tryClaim(UUID eventId, String eventType, String wireVersion) {
        if (eventId == null) {
            return true;
        }
        if (eventIds.containsKey(eventId) || receiptStore.exists(eventId)) {
            logger.info("Skipping already projected lifecycle event",
                    keyValue("action", "lifecycle_event_duplicate"),
                    keyValue("eventId", eventId),
                    keyValue("eventType", eventType),
                    keyValue("wireVersion", wireVersion));
            return false;
        }
        eventIds.put(eventId, Boolean.TRUE);
        trimOldest();
        return true;
    }

    public synchronized void complete(UUID eventId, String eventType, String wireVersion) {
        if (eventId != null) {
            receiptStore.record(eventId, eventType, wireVersion);
        }
    }

    public synchronized void release(UUID eventId) {
        if (eventId != null) {
            eventIds.remove(eventId);
        }
    }

    private void trimOldest() {
        while (eventIds.size() > MAX_EVENT_IDS) {
            UUID oldest = eventIds.keySet().iterator().next();
            eventIds.remove(oldest);
        }
    }
}
