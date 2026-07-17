package com.blockout.notifications.inbox.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.user.application.CurrentUserResolver;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies current-user ownership and preserves state-sensitive mutation results. */
@Service
@RequiredArgsConstructor
public class NotificationInboxMutationApplicationService implements NotificationInboxMutations {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationInboxMutationApplicationService.class);

    private final CurrentUserResolver currentUser;
    private final NotificationInboxMutationStore store;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public long unreadCount() {
        return store.countUnread(currentUser.requireUserId());
    }

    @Override
    @Transactional
    public boolean markRead(Long notificationId) {
        Long userId = currentUser.requireUserId();
        boolean changed = store.markRead(userId, notificationId, Instant.now(clock));
        if (changed) {
            log("Notification marked read", "notification_mark_read", userId, notificationId);
        }
        return changed;
    }

    @Override
    @Transactional
    public boolean markOpened(Long notificationId) {
        Long userId = currentUser.requireUserId();
        boolean changed = store.markOpened(userId, notificationId, Instant.now(clock));
        if (changed) {
            log("Notification marked opened", "notification_mark_opened", userId, notificationId);
        }
        return changed;
    }

    @Override
    @Transactional
    public boolean delete(Long notificationId) {
        Long userId = currentUser.requireUserId();
        boolean changed = store.delete(userId, notificationId);
        if (changed) {
            log("Notification deleted", "notification_delete", userId, notificationId);
        }
        return changed;
    }

    private void log(String message, String action, Long userId, Long notificationId) {
        LOGGER.info(message,
                keyValue("action", action),
                keyValue("userId", userId),
                keyValue("notificationId", notificationId));
    }
}
