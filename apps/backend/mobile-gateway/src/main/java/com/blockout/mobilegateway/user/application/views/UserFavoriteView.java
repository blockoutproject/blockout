package com.blockout.mobilegateway.user.application.views;

import com.blockout.mobilegateway.shared.application.models.EntityType;

/** Favorite projection used by the gateway application layer. */
public record UserFavoriteView(EntityType entityType, Long entityId) {
}
