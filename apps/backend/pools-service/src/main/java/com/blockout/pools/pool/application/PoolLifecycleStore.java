package com.blockout.pools.pool.application;

import java.util.Optional;

public interface PoolLifecycleStore {
    Optional<PoolChange> deactivate(Long id);
}
