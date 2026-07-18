package com.blockout.notifications.inbox.persistence;

import com.blockout.notifications.inbox.application.NotificationInboxMutationStore;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Adapts ownership-scoped application mutations to repository update counts. */
@Component
@RequiredArgsConstructor
public class JpaNotificationInboxMutationStore implements NotificationInboxMutationStore {

    private final NotificationInboxRepository repository;

    @Override
    public long countUnread(Long userId) {
        return repository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public boolean markRead(Long userId, Long notificationId, Instant now) {
        return repository.markRead(userId, notificationId, now) > 0;
    }

    @Override
    public boolean markOpened(Long userId, Long notificationId, Instant now) {
        return repository.markOpened(userId, notificationId, now) > 0;
    }

    @Override
    public boolean delete(Long userId, Long notificationId) {
        return repository.deleteForUser(userId, notificationId) > 0;
    }
}
