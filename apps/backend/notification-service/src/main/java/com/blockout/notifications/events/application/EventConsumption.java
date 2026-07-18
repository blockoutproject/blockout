package com.blockout.notifications.events.application;

import java.util.UUID;

/** Applies legacy or canonical events under one deduplication and acknowledgement policy. */
public interface EventConsumption {

    ConsumedEventResult processLegacy(
            String eventIdHeader,
            String eventType,
            ConsumedEventAction sideEffect);

    ConsumedEventResult processV2(
            UUID bodyEventId,
            String eventIdHeader,
            String eventType,
            ConsumedEventAction sideEffect);
}
