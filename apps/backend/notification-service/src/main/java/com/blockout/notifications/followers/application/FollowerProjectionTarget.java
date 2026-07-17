package com.blockout.notifications.followers.application;

import com.blockout.notifications.models.enums.EntityType;
import java.util.Objects;

/** One canonical favorite target used to rebuild a user's derived projection. */
public record FollowerProjectionTarget(EntityType entityType, Long entityId) {

    public FollowerProjectionTarget {
        Objects.requireNonNull(entityType, "entityType is required");
        if (entityId == null || entityId <= 0) {
            throw new IllegalArgumentException("entityId must be a positive numeric ID");
        }
    }
}
