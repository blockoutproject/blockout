package com.blockout.users.favorite.application;

public interface TeamFollowerProjection {

    void increment(Long teamId, Long userId);

    void decrement(Long teamId, Long userId);
}
