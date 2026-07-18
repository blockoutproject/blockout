package com.blockout.workersearch.events;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LifecycleEventDeduplicatorTest {

    @Test
    void sharesClaimsAcrossWireVersionsAndCanReleaseFailedWork() {
        var store = new MemoryReceiptStore();
        var deduplicator = new LifecycleEventDeduplicator(store);
        UUID eventId = UUID.randomUUID();

        assertThat(deduplicator.tryClaim(eventId, "CLUB_UPSERT", "v1")).isTrue();
        assertThat(deduplicator.tryClaim(eventId, "CLUB_UPSERT", "v2")).isFalse();

        deduplicator.release(eventId);
        assertThat(deduplicator.tryClaim(eventId, "CLUB_UPSERT", "v2")).isTrue();

        deduplicator.complete(eventId, "CLUB_UPSERT", "v2");
        assertThat(new LifecycleEventDeduplicator(store).tryClaim(eventId, "CLUB_UPSERT", "v1")).isFalse();
    }

    @Test
    void keepsPreEventIdLegacyMessagesProcessable() {
        var deduplicator = new LifecycleEventDeduplicator(new MemoryReceiptStore());

        assertThat(deduplicator.legacyEventId(null)).isNull();
        assertThat(deduplicator.tryClaim(null, "TEAM_UPSERT", "v1")).isTrue();
        assertThat(deduplicator.tryClaim(null, "TEAM_UPSERT", "v1")).isTrue();
    }

    private static final class MemoryReceiptStore implements LifecycleEventReceiptStore {
        private final Set<UUID> eventIds = new HashSet<>();

        @Override
        public boolean exists(UUID eventId) {
            return eventIds.contains(eventId);
        }

        @Override
        public void record(UUID eventId, String eventType, String wireVersion) {
            eventIds.add(eventId);
        }
    }
}
