package com.blockout.notifications.events;

import java.util.UUID;

interface ConsumedEventStore {

    boolean tryRecord(UUID eventId, String eventType, String wireVersion);
}
