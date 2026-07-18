package com.blockout.users.favorite.application;

/** Updates the retained synchronous pool follower-count projection. */
public interface PoolFollowerProjection {

    void increment(Long poolId, Long userId);

    void decrement(Long poolId, Long userId);
}
