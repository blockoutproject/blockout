package com.blockout.notifications.inbox.application;

import java.util.List;

/** Returns one immutable zero-based inbox page. */
public record NotificationInboxPage(
        List<NotificationInboxSnapshot> items,
        int page,
        int pageSize,
        boolean hasNext) {

    /** Defensively owns the page items. */
    public NotificationInboxPage {
        items = List.copyOf(items);
    }
}
