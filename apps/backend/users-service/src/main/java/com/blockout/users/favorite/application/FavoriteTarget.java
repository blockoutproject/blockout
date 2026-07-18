package com.blockout.users.favorite.application;

import com.blockout.shared.model.EntityTypeEnum;

/** Identifies one team or pool in the canonical favorite set. */
public record FavoriteTarget(EntityTypeEnum entityType, Long entityId) {
}
