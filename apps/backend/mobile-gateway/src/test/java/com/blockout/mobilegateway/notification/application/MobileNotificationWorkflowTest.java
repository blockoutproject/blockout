package com.blockout.mobilegateway.notification.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MobileNotificationWorkflowTest {

    @Test
    void enrichesDivisionLogosOnceAndPreservesMissingLogoFallback() {
        var withLogo = item(1L, 10L);
        var withoutLogo = item(2L, 20L);
        MobileNotificationGateway notifications = new StubNotificationGateway(new MobileNotificationWorkflow.PageView(
                List.of(withLogo, withoutLogo, withLogo), 0, 20, 3L, false));
        var logos = new RecordingDivisionLogoGateway(Map.of(
                10L, Optional.of("https://cdn.example/division.png"),
                20L, Optional.empty()));

        var result = new MobileNotificationWorkflow(notifications, logos).list(0, 20);

        assertThat(result.items()).extracting(MobileNotificationWorkflow.ItemView::divisionLogoUrl)
                .containsExactly("https://cdn.example/division.png", null, "https://cdn.example/division.png");
        assertThat(result.totalItems()).isEqualTo(3L);
        assertThat(logos.calls).containsEntry(10L, 1).containsEntry(20L, 1);
    }

    private static MobileNotificationWorkflow.ItemView item(Long id, Long divisionId) {
        return new MobileNotificationWorkflow.ItemView(
                id, null, "Title", "Body", null, divisionId, false, false, Instant.EPOCH, null);
    }

    private static final class RecordingDivisionLogoGateway implements DivisionLogoGateway {

        private final Map<Long, Optional<String>> values;
        private final Map<Long, Integer> calls = new HashMap<>();

        private RecordingDivisionLogoGateway(Map<Long, Optional<String>> values) {
            this.values = values;
        }

        @Override
        public Optional<String> findLogo(Long divisionId) {
            calls.merge(divisionId, 1, Integer::sum);
            return values.getOrDefault(divisionId, Optional.empty());
        }
    }

    private record StubNotificationGateway(MobileNotificationWorkflow.PageView page)
            implements MobileNotificationGateway {

        @Override
        public MobileNotificationWorkflow.PageView list(int pageNumber, int pageSize) {
            return page;
        }

        @Override
        public long unreadCount() {
            throw new UnsupportedOperationException();
        }

        @Override
        public void markRead(Long id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void markOpened(Long id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void delete(Long id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void register(Long userId, MobileNotificationWorkflow.PushTokenCommand command) {
            throw new UnsupportedOperationException();
        }
    }
}
