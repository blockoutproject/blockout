package com.blockout.notifications.inbox.application;

/** Exposes current-user inbox reads independently from state mutations. */
public interface NotificationInboxQuery {

    /** Returns the bounded canonical inbox page. */
    NotificationInboxPage listCanonical(int page, int pageSize);

    /** Returns the unbounded compatibility page. */
    NotificationInboxPage listLegacy(int page, int pageSize);
}
