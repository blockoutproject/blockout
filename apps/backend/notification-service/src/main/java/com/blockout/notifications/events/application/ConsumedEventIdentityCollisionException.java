package com.blockout.notifications.events.application;

import java.util.UUID;

/** Rejects reuse of a globally unique event ID for a different event fact. */
public class ConsumedEventIdentityCollisionException extends IllegalStateException {

    public ConsumedEventIdentityCollisionException(UUID eventId, String expectedType, String actualType) {
        super("Consumed event ID %s already belongs to %s, not %s"
                .formatted(eventId, actualType, expectedType));
    }
}
