package com.blockout.users.user.infrastructure.messaging.events;

import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.FollowEventType;

public record UserFollowEvent(Long userId, EntityType entityType, Long entityId, FollowEventType eventType) {
}
