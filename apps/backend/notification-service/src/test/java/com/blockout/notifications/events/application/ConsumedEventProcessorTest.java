package com.blockout.notifications.events.application;

import com.blockout.shared.model.ConsumedEventResultEnum;
import com.blockout.shared.model.ConsumedEventClaimEnum;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
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

        ConsumedEventResultEnum first = processor.processLegacy(
                eventId.toString(), "TEAM_FOLLOWED", effects::incrementAndGet);
        ConsumedEventResultEnum duplicate = processor.processV2(
                eventId, eventId.toString(), "TEAM_FOLLOWED", effects::incrementAndGet);

        assertThat(first).isEqualTo(ConsumedEventResultEnum.APPLIED);
        assertThat(duplicate).isEqualTo(ConsumedEventResultEnum.DUPLICATE);
        assertThat(effects).hasValue(1);
        assertThat(store.types).containsEntry(eventId, "TEAM_FOLLOWED");
    }

    @Test
    void preservesLegacyBacklogWithoutAnEventIdAndRejectsInvalidV2Identity() {
        ConsumedEventProcessor processor = new ConsumedEventProcessor(new MemoryStore());
        AtomicInteger effects = new AtomicInteger();
        UUID eventId = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");

        assertThat(processor.processLegacy(null, "MATCH_FINISHED", effects::incrementAndGet))
                .isEqualTo(ConsumedEventResultEnum.APPLIED);

        assertThat(effects).hasValue(1);
        assertThatThrownBy(() -> processor.processV2(
                eventId, UUID.randomUUID().toString(), "MATCH_FINISHED", effects::incrementAndGet))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void rejectsReuseOfAnEventIdForAnotherFactWithoutApplyingItsEffect() {
        MemoryStore store = new MemoryStore();
        ConsumedEventProcessor processor = new ConsumedEventProcessor(store);
        AtomicInteger effects = new AtomicInteger();
        UUID eventId = UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83");

        processor.processLegacy(eventId.toString(), "TEAM_FOLLOWED", effects::incrementAndGet);

        assertThatThrownBy(() -> processor.processV2(
                eventId, eventId.toString(), "POOL_FOLLOWED", effects::incrementAndGet))
                .isInstanceOf(ConsumedEventIdentityCollisionException.class)
                .hasMessageContaining("TEAM_FOLLOWED")
                .hasMessageContaining("POOL_FOLLOWED");
        assertThat(effects).hasValue(1);
    }

    @Test
    void letsSideEffectFailuresEscapeForTransactionRollbackAndNegativeAcknowledgement() {
        ConsumedEventProcessor processor = new ConsumedEventProcessor(new MemoryStore());

        assertThatThrownBy(() -> processor.processLegacy(
                UUID.randomUUID().toString(),
                "MATCH_FINISHED",
                () -> { throw new IllegalStateException("delivery failed"); }))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("delivery failed");
    }

    private static final class MemoryStore implements ConsumedEventStore {
        private final Map<UUID, String> types = new HashMap<>();

        @Override
        public ConsumedEventClaimEnum claim(ConsumedEventIdentity identity) {
            String existingType = types.putIfAbsent(identity.eventId(), identity.eventType());
            if (existingType == null) {
                return ConsumedEventClaimEnum.CLAIMED;
            }
            if (!existingType.equals(identity.eventType())) {
                throw new ConsumedEventIdentityCollisionException(
                        identity.eventId(), identity.eventType(), existingType);
            }
            return ConsumedEventClaimEnum.DUPLICATE;
        }
    }
}
