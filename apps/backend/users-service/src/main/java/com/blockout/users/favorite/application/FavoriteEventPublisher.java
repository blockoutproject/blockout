package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;

/** Publishes retained favorite lifecycle events until generated v2 events and outboxes replace them. */
public interface FavoriteEventPublisher {

    /** Publishes the deployed CREATED event after the follower projection succeeds. */
    void publishCreated(Long userId, EntityType entityType, Long entityId);

    /** Publishes the deployed DELETED event after the follower projection succeeds. */
    void publishDeleted(Long userId, EntityType entityType, Long entityId);
}
