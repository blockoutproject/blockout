package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;
import java.time.LocalDateTime;

/** Carries favorite state required by canonical and operation-specific legacy projections. */
public record FavoriteView(Long id, EntityType entityType, Long entityId, LocalDateTime createdAt) {
}
