package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;
import java.util.List;

/** Exposes canonical favorite reads and authenticated mutations without transport models. */
public interface FavoriteService {

    /** Returns the retained unpaged view in repository order for the isolated v1 adapter. */
    List<FavoriteView> listUnpaged(Long userId, EntityType entityType);

    /** Returns one stable canonical page ordered by creation time and storage identity. */
    FavoritePage listPage(Long userId, EntityType entityType, int page, int pageSize);

    /** Makes a favorite present while preserving the existing idempotent workflow. */
    void follow(FavoriteCommand command);

    /** Makes a favorite absent while preserving the existing idempotent workflow. */
    void unfollow(FavoriteCommand command);
}
