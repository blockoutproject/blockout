package com.blockout.pools.pool.application;

public interface PoolUpdate {
    PoolView current();
    PoolChange apply(PoolUpdatePlan plan);
}
