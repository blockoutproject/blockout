package com.blockout.users.favorite.application;

/** Supplies one canonical target count as a bounded team or pool rebuild input. */
public record FollowerCountSnapshot(FavoriteTarget target, long followerCount) {
}
