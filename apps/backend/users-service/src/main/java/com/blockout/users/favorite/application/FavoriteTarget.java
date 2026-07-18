package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;

/** Identifies one team or pool in the canonical favorite set. */
public record FavoriteTarget(EntityType entityType, Long entityId) {
}
