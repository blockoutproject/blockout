package com.blockout.users.user.application.ports;

import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.FollowEventType;

public interface UserFollowPublisher {

    void publish(Long userId, EntityType entityType, Long entityId, FollowEventType eventType);
}
