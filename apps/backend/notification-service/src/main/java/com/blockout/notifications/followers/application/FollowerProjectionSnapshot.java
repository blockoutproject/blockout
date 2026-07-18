package com.blockout.notifications.followers.application;

import java.util.Objects;
import java.util.Set;

/** One bounded canonical desired-state snapshot supplied by the favorite owner. */
public record FollowerProjectionSnapshot(Long userId, Set<FollowerProjectionTarget> favorites) {

    public FollowerProjectionSnapshot {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId must be a positive numeric ID");
        }
        favorites = Set.copyOf(Objects.requireNonNull(favorites, "favorites are required"));
    }
}
