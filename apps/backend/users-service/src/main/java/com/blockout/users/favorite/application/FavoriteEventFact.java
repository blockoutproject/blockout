package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;
import java.util.Objects;

/** Application fact mapped to either the retained v1 event or the generated v2 contract. */
public record FavoriteEventFact(Long userId, EntityType entityType, Long entityId, FavoriteEventAction action) {

    public FavoriteEventFact {
        requirePositive(userId, "userId");
        Objects.requireNonNull(entityType, "entityType is required");
        requirePositive(entityId, "entityId");
        Objects.requireNonNull(action, "action is required");
    }

    private static void requirePositive(Long value, String field) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(field + " must be a positive numeric ID");
        }
    }
}
