package com.blockout.pools.pool.application;

import java.util.Optional;

public interface PoolFollowerStore {
    Optional<PoolView> updateFollowers(PoolFollowerCommand command);
}
