package com.blockout.notifications.inbox.application;

import com.blockout.notifications.user.application.CurrentUserResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns canonical and compatibility inbox query policy. */
@Service
@RequiredArgsConstructor
public class NotificationInboxApplicationService implements NotificationInboxQuery {

    private static final int MAX_CANONICAL_PAGE_SIZE = 100;

    private final CurrentUserResolver users;
    private final NotificationInboxStore inbox;

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public NotificationInboxPage listCanonical(int page, int pageSize) {
        if (page < 0 || pageSize < 1 || pageSize > MAX_CANONICAL_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid notification page.");
        }
        return inbox.findStable(users.requireUserId(), page, pageSize);
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public NotificationInboxPage listLegacy(int page, int pageSize) {
        return inbox.findLegacy(users.requireUserId(), page, pageSize);
    }
}
