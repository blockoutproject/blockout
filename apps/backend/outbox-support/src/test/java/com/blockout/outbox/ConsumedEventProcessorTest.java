package com.blockout.outbox;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class ConsumedEventProcessorTest {

    @Test
    void sharesExactEventIdsAcrossLegacyAndV2Adapters() {
        var processor = new ConsumedEventProcessor(new MemoryStore());
        var calls = new AtomicInteger();
        UUID eventId = UUID.randomUUID();

        processor.processLegacy(eventId.toString(), "CLUB_DEACTIVATED", calls::incrementAndGet);
        processor.processV2(eventId, "CLUB_DEACTIVATED", calls::incrementAndGet);

        assertThat(calls).hasValue(1);
    }

    @Test
    void preservesLegacyMessagesWithoutEventIds() {
        var processor = new ConsumedEventProcessor(new MemoryStore());
        var calls = new AtomicInteger();

        processor.processLegacy(null, "TEAM_DEACTIVATED", calls::incrementAndGet);
        processor.processLegacy(null, "TEAM_DEACTIVATED", calls::incrementAndGet);

        assertThat(calls).hasValue(2);
    }

    private static final class MemoryStore implements ConsumedEventStore {
        private final Set<UUID> eventIds = new HashSet<>();

        @Override
        public boolean tryRecord(UUID eventId, String eventType, String wireVersion) {
            return eventIds.add(eventId);
        }
    }
}
