package com.blockout.users.favorite.application;

import com.blockout.shared.model.EntityTypeEnum;

/** Records notification follower-projection facts through the retained transactional outbox boundary. */
public interface FavoriteEventPublisher {

    /** Records the retained CREATED and canonical FOLLOWED facts after the synchronous projection succeeds. */
    void publishCreated(Long userId, EntityTypeEnum entityType, Long entityId);

    /** Records the retained DELETED and canonical UNFOLLOWED facts after the synchronous projection succeeds. */
    void publishDeleted(Long userId, EntityTypeEnum entityType, Long entityId);
}
