package com.blockout.notifications.inbox.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.notifications.user.application.CurrentUserProvider;
import com.blockout.notifications.user.application.CurrentUserResolver;
import com.blockout.notifications.user.application.CurrentUserSnapshot;
import com.blockout.notifications.user.application.CurrentUserNotFoundException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NotificationInboxApplicationServiceTest {

    private FakeCurrentUserProvider users;
    private RecordingInboxStore inbox;
    private NotificationInboxApplicationService service;

    @BeforeEach
    void setUp() {
        users = new FakeCurrentUserProvider();
        inbox = new RecordingInboxStore();
        service = new NotificationInboxApplicationService(new CurrentUserResolver(users), inbox);
    }

    @Test
    void delegatesCanonicalPagesToStableStorageForTheResolvedLocalUser() {
        NotificationInboxPage expected = new NotificationInboxPage(List.of(), 2, 25, true);
        users.result = new CurrentUserSnapshot(41L);
        inbox.result = expected;

        assertThat(service.listCanonical(2, 25)).isSameAs(expected);
        assertThat(inbox.lastCall).isEqualTo("stable:41:2:25");
    }

    @Test
    void rejectsCanonicalBoundsBeforeCallingDownstreamBoundaries() {
        assertThatIllegalArgumentException().isThrownBy(() -> service.listCanonical(-1, 25));
        assertThatIllegalArgumentException().isThrownBy(() -> service.listCanonical(0, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> service.listCanonical(0, 101));

        assertThat(users.calls).isZero();
        assertThat(inbox.lastCall).isNull();
    }

    @Test
    void preservesLegacyPaginationDelegationWithoutNewValidation() {
        NotificationInboxPage expected = new NotificationInboxPage(List.of(), -1, 0, false);
        users.result = new CurrentUserSnapshot(42L);
        inbox.result = expected;

        assertThat(service.listLegacy(-1, 0)).isSameAs(expected);
        assertThat(inbox.lastCall).isEqualTo("legacy:42:-1:0");
    }

    @Test
    void preservesTheDeployedMissingUserFailure() {
        users.result = null;

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.listCanonical(0, 20))
                .isInstanceOf(CurrentUserNotFoundException.class)
                .hasMessage("Utilisateur introuvable");
        assertThat(inbox.lastCall).isNull();
    }

    private static final class FakeCurrentUserProvider implements CurrentUserProvider {
        private CurrentUserSnapshot result;
        private int calls;

        @Override
        public CurrentUserSnapshot getCurrentUser() {
            calls++;
            return result;
        }
    }

    private static final class RecordingInboxStore implements NotificationInboxStore {
        private NotificationInboxPage result;
        private String lastCall;

        @Override
        public NotificationInboxPage findStable(Long userId, int page, int pageSize) {
            lastCall = "stable:%d:%d:%d".formatted(userId, page, pageSize);
            return result;
        }

        @Override
        public NotificationInboxPage findLegacy(Long userId, int page, int pageSize) {
            lastCall = "legacy:%d:%d:%d".formatted(userId, page, pageSize);
            return result;
        }
    }
}
