package com.blockout.notifications.inbox.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.user.application.CurrentUserProvider;
import com.blockout.notifications.user.application.CurrentUserResolver;
import com.blockout.notifications.user.application.CurrentUserSnapshot;
import com.blockout.notifications.user.application.CurrentUserNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NotificationInboxMutationApplicationServiceTest {

    private FakeCurrentUserProvider users;
    private RecordingMutationStore store;
    private NotificationInboxMutationApplicationService service;

    @BeforeEach
    void setUp() {
        users = new FakeCurrentUserProvider();
        store = new RecordingMutationStore();
        service = new NotificationInboxMutationApplicationService(
                new CurrentUserResolver(users),
                store,
                Clock.fixed(Instant.parse("2026-07-17T12:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void unreadCountUsesOnlyTheResolvedCurrentUser() {
        users.result = new CurrentUserSnapshot(41L);
        store.unread = 7L;

        assertThat(service.unreadCount()).isEqualTo(7L);
        assertThat(store.call).isEqualTo("count:41");
    }

    @Test
    void stateMutationsPreserveRepositoryChangeResultsAndTimestamp() {
        users.result = new CurrentUserSnapshot(42L);
        store.changed = true;

        assertThat(service.markRead(51L)).isTrue();
        assertThat(store.call).isEqualTo("read:42:51:2026-07-17T12:00:00Z");
        assertThat(service.markOpened(52L)).isTrue();
        assertThat(store.call).isEqualTo("opened:42:52:2026-07-17T12:00:00Z");
        assertThat(service.delete(53L)).isTrue();
        assertThat(store.call).isEqualTo("delete:42:53");

        store.changed = false;
        assertThat(service.markRead(54L)).isFalse();
    }

    @Test
    void missingCurrentUserFailsBeforeMutationStorage() {
        users.result = null;

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.delete(51L))
                .isInstanceOf(CurrentUserNotFoundException.class)
                .hasMessage("Utilisateur introuvable");
        assertThat(store.call).isNull();
    }

    private static final class FakeCurrentUserProvider implements CurrentUserProvider {
        private CurrentUserSnapshot result;

        @Override
        public CurrentUserSnapshot getCurrentUser() {
            return result;
        }
    }

    private static final class RecordingMutationStore implements NotificationInboxMutationStore {
        private long unread;
        private boolean changed;
        private String call;

        @Override
        public long countUnread(Long userId) {
            call = "count:" + userId;
            return unread;
        }

        @Override
        public boolean markRead(Long userId, Long notificationId, Instant now) {
            call = "read:%d:%d:%s".formatted(userId, notificationId, now);
            return changed;
        }

        @Override
        public boolean markOpened(Long userId, Long notificationId, Instant now) {
            call = "opened:%d:%d:%s".formatted(userId, notificationId, now);
            return changed;
        }

        @Override
        public boolean delete(Long userId, Long notificationId) {
            call = "delete:%d:%d".formatted(userId, notificationId);
            return changed;
        }
    }
}
