package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;
import java.util.List;
import java.util.Optional;

/** Owns canonical favorite persistence and account resolution required by favorite use cases. */
public interface FavoriteStore {

    Optional<FavoriteOwner> findOwnerByAuth0Id(String auth0Id);

    boolean ownerExists(Long userId);

    List<FavoriteView> findUnpaged(Long userId, EntityType entityType);

    FavoritePage findPage(Long userId, EntityType entityType, int page, int pageSize);

    FavoriteProjectionSnapshot snapshotForUser(Long userId);

    FollowerCountSnapshot snapshotForTarget(EntityType entityType, Long entityId);
}
