package com.blockout.notifications.inbox.application;

import java.time.Instant;

/** Persists inbox mutations already scoped to one resolved local user. */
public interface NotificationInboxMutationStore {

    long countUnread(Long userId);

    boolean markRead(Long userId, Long notificationId, Instant now);

    boolean markOpened(Long userId, Long notificationId, Instant now);

    boolean delete(Long userId, Long notificationId);
}
