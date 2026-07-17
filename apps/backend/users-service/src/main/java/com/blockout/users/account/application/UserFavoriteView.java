package com.blockout.users.account.application;

import com.blockout.users.models.enums.EntityType;
import java.time.LocalDateTime;

/** Carries favorite state needed by canonical summaries and operation-specific v1 projections. */
public record UserFavoriteView(Long id, EntityType entityType, Long entityId, LocalDateTime createdAt) {
}
