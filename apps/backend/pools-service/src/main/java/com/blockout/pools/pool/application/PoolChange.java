package com.blockout.pools.pool.application;

public record PoolChange(PoolView before, PoolView after) {

    public boolean changed() {
        return !before.equals(after);
    }
}
