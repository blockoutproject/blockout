package com.blockout.users.favorite.application;

import com.blockout.shared.model.EntityTypeEnum;
import java.util.List;
import java.util.Optional;

/** Owns canonical favorite persistence and account resolution required by favorite use cases. */
public interface FavoriteStore {

    Optional<FavoriteOwner> findOwnerByAuth0Id(String auth0Id);

    boolean ownerExists(Long userId);

    List<FavoriteView> findUnpaged(Long userId, EntityTypeEnum entityType);

    FavoritePage findPage(Long userId, EntityTypeEnum entityType, int page, int pageSize);

    FavoriteProjectionSnapshot snapshotForUser(Long userId);

    FollowerCountSnapshot snapshotForTarget(EntityTypeEnum entityType, Long entityId);
}
