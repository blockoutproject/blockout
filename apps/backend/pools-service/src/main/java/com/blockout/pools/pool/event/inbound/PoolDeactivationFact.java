package com.blockout.pools.pool.event.inbound;

import java.util.UUID;

record PoolDeactivationFact(UUID eventId, String eventType, Long poolId) {
}
