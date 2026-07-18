package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;

/** Exposes canonical snapshots without activating a new transport or downstream repair workflow. */
public interface FavoriteProjectionSource {

    FavoriteProjectionSnapshot snapshotForUser(Long userId);

    FollowerCountSnapshot snapshotForTarget(EntityType entityType, Long entityId);
}
