package com.blockout.workersearch.events;

import java.util.UUID;

public record DecodedLifecycleEvent<T>(UUID eventId, String eventType, T projectionEvent) {}
