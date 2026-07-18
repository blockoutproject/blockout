package com.blockout.users.favorite.application;

/** Describes one effective canonical favorite transition and its persisted identity. */
public record FavoriteChange(
        Long userId,
        FavoriteTarget target,
        FavoriteEventAction action,
        Long favoriteId) {
}
