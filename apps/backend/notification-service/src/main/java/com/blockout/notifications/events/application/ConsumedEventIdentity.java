package com.blockout.notifications.events.application;

import java.util.Objects;
import java.util.UUID;

/** Identifies one event independently from its Rabbit wire version. */
public record ConsumedEventIdentity(UUID eventId, String eventType, String wireVersion) {

    public ConsumedEventIdentity {
        Objects.requireNonNull(eventId, "eventId is required");
        eventType = requireText(eventType, "eventType");
        wireVersion = requireText(wireVersion, "wireVersion");
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must be non-blank");
        }
        return value;
    }
}
