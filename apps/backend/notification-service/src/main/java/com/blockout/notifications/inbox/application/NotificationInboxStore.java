package com.blockout.notifications.inbox.application;

/** Reads notification pages without exposing JPA or Spring Data types. */
public interface NotificationInboxStore {

    /** Reads a canonical page with a deterministic identity tie-breaker. */
    NotificationInboxPage findStable(Long userId, int page, int pageSize);

    /** Reads a compatibility page with the deployed v1 ordering. */
    NotificationInboxPage findLegacy(Long userId, int page, int pageSize);
}
