package com.blockout.notifications.followers.application;

import com.blockout.notifications.models.enums.EntityType;
import java.util.Objects;

/** Validated projection input independent from either Rabbit wire version. */
public record FollowerProjectionCommand(
        Long userId,
        EntityType entityType,
        Long entityId,
        FollowerProjectionAction action) {

    public FollowerProjectionCommand {
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
