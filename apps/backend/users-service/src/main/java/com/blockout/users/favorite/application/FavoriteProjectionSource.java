package com.blockout.users.favorite.application;

import com.blockout.shared.model.EntityTypeEnum;

/** Exposes canonical snapshots without activating a new transport or downstream repair workflow. */
public interface FavoriteProjectionSource {

    FavoriteProjectionSnapshot snapshotForUser(Long userId);

    FollowerCountSnapshot snapshotForTarget(EntityTypeEnum entityType, Long entityId);
}
