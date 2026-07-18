package com.blockout.notifications.delivery.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.inbox.application.CreateInboxNotificationCommand;
import com.blockout.notifications.inbox.application.NotificationInboxWriter;
import com.blockout.shared.model.NotificationTypeEnum;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class NotificationDeliveryApplicationServiceTest {

    @Test
    void retainsReservationInboxTokenAndTypedLedgerOrder() {
        List<String> actions = new ArrayList<>();
        RecordingLedger ledger = new RecordingLedger(actions, List.of(1L, 2L));
        NotificationInboxWriter inbox = commands -> actions.add("inbox:" + userIds(commands));
        DeliveryTokenCatalog tokens = new DeliveryTokenCatalog() {
            @Override
            public DeliveryTokenPage resolvePage(List<Long> userIds) {
                actions.add("resolve:" + userIds);
                return new DeliveryTokenPage(Map.of(1L, List.of("token-1")), Set.of(2L));
            }

            @Override
            public void deactivateInvalidTokens(List<String> invalidTokens) {
                actions.add("deactivate:" + invalidTokens);
            }
        };
        PushDeliveryProvider provider = messages -> {
            actions.add("push:" + messages.stream().map(DeliveryMessage::userId).toList());
            return new DeliveryBatchResult(Set.of(1L), Set.of(), Set.of(), List.of("bad-token"));
        };
        NotificationDeliveryApplicationService service =
                new NotificationDeliveryApplicationService(ledger, inbox, tokens, provider);

        service.deliver(command());

        assertThat(actions).containsExactly(
                "reserve:MATCH_FINISHED",
                "inbox:[1, 2]",
                "resolve:[1, 2]",
                "no-token:MATCH_FINISHED:[2]",
                "push:[1]",
                "sent:MATCH_FINISHED:[1]",
                "deactivate:[bad-token]");
    }

    @Test
    void successWinsAcrossProviderBatchesForTheSameUser() {
        RecordingLedger ledger = new RecordingLedger(new ArrayList<>(), List.of(1L));
        Map<Long, List<String>> tokensByUser = new LinkedHashMap<>();
        List<String> userTokens = new ArrayList<>();
        for (int index = 0; index < 101; index++) {
            userTokens.add("token-" + index);
        }
        tokensByUser.put(1L, userTokens);
        AtomicBatchProvider provider = new AtomicBatchProvider();
        NotificationDeliveryApplicationService service = new NotificationDeliveryApplicationService(
                ledger,
                ignored -> { },
                tokenCatalog(tokensByUser),
                provider);

        service.deliver(command());

        assertThat(provider.calls).isEqualTo(2);
        assertThat(ledger.sent).containsExactly(1L);
        assertThat(ledger.failed).isEmpty();
    }

    @Test
    void incompleteTicketsRemainPendingAsExplicitRetryableUsers() {
        RecordingLedger ledger = new RecordingLedger(new ArrayList<>(), List.of(1L));
        NotificationDeliveryApplicationService service = new NotificationDeliveryApplicationService(
                ledger,
                ignored -> { },
                tokenCatalog(Map.of(1L, List.of("token-1"))),
                ignored -> new DeliveryBatchResult(Set.of(), Set.of(), Set.of(1L), List.of()));

        service.deliver(command());

        assertThat(ledger.sent).isEmpty();
        assertThat(ledger.failed).isEmpty();
        assertThat(ledger.noToken).isEmpty();
    }

    @Test
    void retryableWinsOverFailureAcrossProviderBatches() {
        RecordingLedger ledger = new RecordingLedger(new ArrayList<>(), List.of(1L));
        Map<Long, List<String>> tokensByUser = new LinkedHashMap<>();
        List<String> userTokens = new ArrayList<>();
        for (int index = 0; index < 101; index++) {
            userTokens.add("token-" + index);
        }
        tokensByUser.put(1L, userTokens);
        PushDeliveryProvider provider = new PushDeliveryProvider() {
            private int calls;

            @Override
            public DeliveryBatchResult sendBatch(List<DeliveryMessage> messages) {
                calls++;
                return calls == 1
                        ? new DeliveryBatchResult(Set.of(), Set.of(1L), Set.of(), List.of())
                        : new DeliveryBatchResult(Set.of(), Set.of(), Set.of(1L), List.of());
            }
        };
        NotificationDeliveryApplicationService service = new NotificationDeliveryApplicationService(
                ledger,
                ignored -> { },
                tokenCatalog(tokensByUser),
                provider);

        service.deliver(command());

        assertThat(ledger.sent).isEmpty();
        assertThat(ledger.failed).isEmpty();
    }

    private NotificationDeliveryCommand command() {
        return new NotificationDeliveryCommand(
                42L, 10L, 11L, 12L, NotificationTypeEnum.MATCH_FINISHED,
                "Title", "Body", 13L);
    }

    private DeliveryTokenCatalog tokenCatalog(Map<Long, List<String>> tokensByUser) {
        return new DeliveryTokenCatalog() {
            @Override
            public DeliveryTokenPage resolvePage(List<Long> userIds) {
                return new DeliveryTokenPage(tokensByUser, Set.of());
            }

            @Override
            public void deactivateInvalidTokens(List<String> tokens) {
            }
        };
    }

    private static List<Long> userIds(List<CreateInboxNotificationCommand> commands) {
        return commands.stream().map(CreateInboxNotificationCommand::userId).toList();
    }

    private static final class AtomicBatchProvider implements PushDeliveryProvider {
        private int calls;

        @Override
        public DeliveryBatchResult sendBatch(List<DeliveryMessage> messages) {
            calls++;
            return calls == 1
                    ? new DeliveryBatchResult(Set.of(1L), Set.of(), Set.of(), List.of())
                    : new DeliveryBatchResult(Set.of(), Set.of(1L), Set.of(), List.of());
        }
    }

    private static final class RecordingLedger implements DeliveryLedger {
        private final List<String> actions;
        private final List<Long> reserved;
        private final List<Long> sent = new ArrayList<>();
        private final List<Long> failed = new ArrayList<>();
        private final List<Long> noToken = new ArrayList<>();

        private RecordingLedger(List<String> actions, List<Long> reserved) {
            this.actions = actions;
            this.reserved = reserved;
        }

        @Override
        public List<Long> reserve(DeliveryReservation reservation) {
            actions.add("reserve:" + reservation.attempt().notificationType());
            return reserved;
        }

        @Override
        public int markSent(DeliveryAttemptKey attempt, Collection<Long> userIds) {
            sent.addAll(userIds);
            actions.add("sent:" + attempt.notificationType() + ":" + userIds);
            return userIds.size();
        }

        @Override
        public int markNoToken(DeliveryAttemptKey attempt, Collection<Long> userIds) {
            noToken.addAll(userIds);
            actions.add("no-token:" + attempt.notificationType() + ":" + userIds);
            return userIds.size();
        }

        @Override
        public int markFailed(
                DeliveryAttemptKey attempt,
                Collection<Long> userIds,
                String errorCode,
                String errorDetail) {
            failed.addAll(userIds);
            actions.add("failed:" + attempt.notificationType() + ":" + userIds);
            return userIds.size();
        }
    }
}
