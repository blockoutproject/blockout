package com.blockout.users.favorite.application;

import java.util.Set;

/** Supplies one user's canonical favorite set as a bounded notification rebuild input. */
public record FavoriteProjectionSnapshot(Long userId, Set<FavoriteTarget> favorites) {

    public FavoriteProjectionSnapshot {
        favorites = Set.copyOf(favorites);
    }
}
