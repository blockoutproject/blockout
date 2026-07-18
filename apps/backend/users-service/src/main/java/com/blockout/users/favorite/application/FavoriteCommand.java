package com.blockout.users.favorite.application;

import com.blockout.shared.model.EntityTypeEnum;

/** Identifies one authenticated request to change canonical favorite state. */
public record FavoriteCommand(String auth0Id, EntityTypeEnum entityType, Long entityId) {
}
