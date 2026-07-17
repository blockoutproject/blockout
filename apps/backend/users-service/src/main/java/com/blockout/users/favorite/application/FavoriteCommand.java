package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;

/** Identifies one authenticated request to change canonical favorite state. */
public record FavoriteCommand(String auth0Id, EntityType entityType, Long entityId) {
}
