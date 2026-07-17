package com.blockout.pools.pool.application;

public record PoolFollowerCommand(Long poolId, Long userId, Delta delta) {

    public enum Delta {
        INCREMENT,
        DECREMENT
    }
}
