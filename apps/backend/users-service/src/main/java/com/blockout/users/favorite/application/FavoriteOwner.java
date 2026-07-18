package com.blockout.users.favorite.application;

import java.util.Optional;

/** Retains one resolved local account across a transactional favorite mutation. */
public interface FavoriteOwner {

    Long userId();

    /** Makes the target present and reports only an effective canonical transition. */
    Optional<FavoriteChange> follow(FavoriteTarget target);

    /** Makes the target absent and reports only an effective canonical transition. */
    Optional<FavoriteChange> unfollow(FavoriteTarget target);
}
