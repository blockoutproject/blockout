package com.blockout.notifications.inbox.application;

/** Owns current-user inbox count and state mutation use cases. */
public interface NotificationInboxMutations {

    long unreadCount();

    boolean markRead(Long notificationId);

    boolean markOpened(Long notificationId);

    boolean delete(Long notificationId);
}
