package com.blockout.notifications.events.application;

import com.blockout.shared.model.ConsumedEventResultEnum;
import com.blockout.shared.model.ConsumedEventClaimEnum;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Couples one event claim and its local side effect under AUTO acknowledgement semantics. */
@Service
@RequiredArgsConstructor
public class ConsumedEventProcessor implements EventConsumption {

    private static final Logger LOGGER = LoggerFactory.getLogger(ConsumedEventProcessor.class);

    private final ConsumedEventStore store;

    @Transactional
    @Override
    public ConsumedEventResultEnum processLegacy(
            String eventIdHeader,
            String eventType,
            ConsumedEventAction sideEffect) {
        if (eventIdHeader == null) {
            LOGGER.info("Processing legacy event without deduplication marker",
                    keyValue("action", "legacy_event_without_id"),
                    keyValue("eventType", eventType));
            sideEffect.apply();
            return ConsumedEventResultEnum.APPLIED;
        }
        return process(new ConsumedEventIdentity(UUID.fromString(eventIdHeader), eventType, "v1"), sideEffect);
    }

    @Transactional
    @Override
    public ConsumedEventResultEnum processV2(
            UUID bodyEventId,
            String eventIdHeader,
            String eventType,
            ConsumedEventAction sideEffect) {
        if (eventIdHeader == null) {
            throw new IllegalArgumentException("V2 x-blockout-event-id is required");
        }
        if (bodyEventId == null) {
            throw new IllegalArgumentException("V2 body eventId is required");
        }
        UUID headerEventId = UUID.fromString(eventIdHeader);
        if (!bodyEventId.equals(headerEventId)) {
            throw new IllegalArgumentException("V2 body eventId does not match x-blockout-event-id");
        }
        return process(new ConsumedEventIdentity(bodyEventId, eventType, "v2"), sideEffect);
    }

    private ConsumedEventResultEnum process(ConsumedEventIdentity identity, ConsumedEventAction sideEffect) {
        if (store.claim(identity) == ConsumedEventClaimEnum.DUPLICATE) {
            LOGGER.info("Skipping already consumed event",
                    keyValue("action", "consumed_event_duplicate"),
                    keyValue("eventId", identity.eventId()),
                    keyValue("eventType", identity.eventType()),
                    keyValue("wireVersion", identity.wireVersion()));
            return ConsumedEventResultEnum.DUPLICATE;
        }
        sideEffect.apply();
        LOGGER.info("Recorded consumed event",
                keyValue("action", "consumed_event_recorded"),
                keyValue("eventId", identity.eventId()),
                keyValue("eventType", identity.eventType()),
                keyValue("wireVersion", identity.wireVersion()));
        return ConsumedEventResultEnum.APPLIED;
    }
}
