package com.blockout.users.favorite.application;

public interface PoolFollowerProjection {

    void increment(Long poolId, Long userId);

    void decrement(Long poolId, Long userId);
}
