package com.blockout.users.account.application;

import com.blockout.shared.model.EntityTypeEnum;

/** Records follower-projection facts required by one account-deletion plan. */
public interface AccountDeletionEventPublisher {

    /** Records one retained favorite deletion fact through the transactional outbox. */
    void publishFavoriteDeleted(Long userId, EntityTypeEnum entityType, Long entityId);
}
