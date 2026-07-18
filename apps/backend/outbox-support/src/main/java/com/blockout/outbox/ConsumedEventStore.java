package com.blockout.outbox;

import java.util.UUID;

interface ConsumedEventStore {

    boolean tryRecord(UUID eventId, String eventType, String wireVersion);
}
