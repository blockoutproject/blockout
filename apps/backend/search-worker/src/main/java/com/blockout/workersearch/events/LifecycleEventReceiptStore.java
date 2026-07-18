package com.blockout.workersearch.events;

import java.util.UUID;

public interface LifecycleEventReceiptStore {

    boolean exists(UUID eventId);

    void record(UUID eventId, String eventType, String wireVersion);
}
