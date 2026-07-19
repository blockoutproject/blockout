package com.blockout.users.user.application.ports;

import com.blockout.users.user.application.models.EntityType;

public interface FollowerCounter {

    void increment(EntityType entityType, Long entityId, Long userId);

    void decrement(EntityType entityType, Long entityId, Long userId);
}
