package com.blockout.pools.pool.application.ports;

import com.blockout.pools.pool.application.views.PoolView;

/**
 * Publishes purpose-specific Pool lifecycle messages.
 */
public interface PoolEventPublisher {
    void publishPoolUpsert(PoolView pool);
}
