package com.blockout.notifications.events.application;

import com.blockout.shared.model.ConsumedEventResultEnum;
import java.util.UUID;

/** Applies legacy or canonical events under one deduplication and acknowledgement policy. */
public interface EventConsumption {

    ConsumedEventResultEnum processLegacy(
            String eventIdHeader,
            String eventType,
            ConsumedEventAction sideEffect);

    ConsumedEventResultEnum processV2(
            UUID bodyEventId,
            String eventIdHeader,
            String eventType,
            ConsumedEventAction sideEffect);
}
