package com.blockout.pools.pool.infrastructure.messaging.events;

/** Command requesting one Pool deactivation. */
public record PoolDeactivationEvent(Long poolId) {
}
