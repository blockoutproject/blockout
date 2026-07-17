package com.blockout.notifications.events;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class ConsumedEventProcessorTest {

    @Test
    void deduplicatesTheSameEventIdAcrossV1AndV2() {
        MemoryStore store = new MemoryStore();
        ConsumedEventProcessor processor = new ConsumedEventProcessor(store);
        AtomicInteger effects = new AtomicInteger();
        UUID eventId = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");

        processor.processLegacy(eventId.toString(), "TEAM_FOLLOWED", effects::incrementAndGet);
        processor.processV2(eventId, eventId.toString(), "TEAM_FOLLOWED", effects::incrementAndGet);

        assertThat(effects).hasValue(1);
        assertThat(store.ids).containsExactly(eventId);
    }

    @Test
    void preservesLegacyBacklogWithoutAnEventIdAndRejectsInvalidIdentity() {
        ConsumedEventProcessor processor = new ConsumedEventProcessor(new MemoryStore());
        AtomicInteger effects = new AtomicInteger();
        UUID eventId = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");

        processor.processLegacy(null, "MATCH_FINISHED", effects::incrementAndGet);

        assertThat(effects).hasValue(1);
        assertThatThrownBy(() -> processor.processV2(
                eventId, UUID.randomUUID().toString(), "MATCH_FINISHED", effects::incrementAndGet))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
    }

    private static final class MemoryStore implements ConsumedEventStore {
        private final Set<UUID> ids = new HashSet<>();

        @Override
        public boolean tryRecord(UUID eventId, String eventType, String wireVersion) {
            return ids.add(eventId);
        }
    }
}
