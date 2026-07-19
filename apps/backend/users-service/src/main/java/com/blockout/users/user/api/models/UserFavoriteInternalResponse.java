package com.blockout.users.user.api.models;

import com.blockout.users.user.application.models.EntityType;

import java.time.LocalDateTime;

/** Complete response exposed by the dedicated favorites endpoint. */
public record UserFavoriteInternalResponse(Long id, EntityType entityType, Long entityId, LocalDateTime createdAt) {
}
