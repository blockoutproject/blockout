package com.blockout.users.user.application.views;

import com.blockout.users.user.application.models.EntityType;

import java.time.LocalDateTime;

public record UserFavoriteView(Long id, EntityType entityType, Long entityId, LocalDateTime createdAt) {
}
