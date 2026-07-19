package com.blockout.pools.pool.application;

public interface PoolEventPublisher {

    void publishUpsert(PoolEventData pool);

    void publishProjection(PoolEventData pool);
}
