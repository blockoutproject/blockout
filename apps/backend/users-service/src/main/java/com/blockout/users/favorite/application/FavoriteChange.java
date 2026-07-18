package com.blockout.users.favorite.application;

import com.blockout.shared.model.FavoriteEventActionEnum;
/** Describes one effective canonical favorite transition and its persisted identity. */
public record FavoriteChange(
        Long userId,
        FavoriteTarget target,
        FavoriteEventActionEnum action,
        Long favoriteId) {
}
