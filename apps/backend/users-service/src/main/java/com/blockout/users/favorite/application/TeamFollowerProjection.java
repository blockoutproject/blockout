package com.blockout.users.favorite.application;

/** Updates the retained synchronous team follower-count projection. */
public interface TeamFollowerProjection {

    void increment(Long teamId, Long userId);

    void decrement(Long teamId, Long userId);
}
