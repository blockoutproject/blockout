package com.blockout.users.favorite.application;

import com.blockout.shared.model.EntityTypeEnum;
import java.time.LocalDateTime;

/** Carries favorite state required by canonical and operation-specific legacy projections. */
public record FavoriteView(Long id, EntityTypeEnum entityType, Long entityId, LocalDateTime createdAt) {
}
