package com.blockout.pools.pool.application;

public interface PoolEventPublisher {

    void publishUpsert(PoolView pool);
}
