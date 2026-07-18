package com.blockout.notifications.followers.application;

import java.util.Set;

/** Persists the notification-owned follower projection without exposing JPA rows. */
public interface FollowerProjectionStore {

    boolean add(Long userId, FollowerProjectionTarget target);

    boolean remove(Long userId, FollowerProjectionTarget target);

    Set<FollowerProjectionTarget> findByUserId(Long userId);
}
