package com.blockout.users.user.api.models;

import com.blockout.users.user.application.models.EntityType;

/**
 * Favorite summary nested in the complete User response.
 */
public record UserFavoriteSummaryInternalResponse(EntityType entityType, Long entityId) {
}
