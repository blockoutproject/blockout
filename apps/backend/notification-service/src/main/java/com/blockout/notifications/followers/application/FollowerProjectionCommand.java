package com.blockout.notifications.followers.application;

import com.blockout.shared.model.FollowerProjectionActionEnum;
import com.blockout.shared.model.EntityTypeEnum;
import java.util.Objects;

/** Validated projection input independent from either Rabbit wire version. */
public record FollowerProjectionCommand(
        Long userId,
        EntityTypeEnum entityType,
        Long entityId,
        FollowerProjectionActionEnum action) {

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
