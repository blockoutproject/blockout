package com.blockout.notifications.delivery.provider;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.delivery.application.DeliveryBatchResult;
import com.blockout.notifications.delivery.application.DeliveryMessage;
import com.niamedtech.expo.exposerversdk.request.PushNotification;
import com.niamedtech.expo.exposerversdk.response.Status;
import com.niamedtech.expo.exposerversdk.response.TicketResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class ExpoPushDeliveryProviderTest {

    @Test
    void emptyBatchDoesNotCallExpo() {
        AtomicInteger calls = new AtomicInteger();
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(notifications -> {
            calls.incrementAndGet();
            return List.of();
        });

        DeliveryBatchResult result = provider.sendBatch(List.of());

        assertThat(calls).hasValue(0);
        assertThat(result.successfulUserIds()).isEmpty();
        assertThat(result.failedUserIds()).isEmpty();
        assertThat(result.retryableUserIds()).isEmpty();
        assertThat(result.invalidTokens()).isEmpty();
    }

    @Test
    void providerFailureMarksEveryUserInTheBoundedBatchAsFailed() {
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(notifications -> {
            throw new IllegalStateException("provider unavailable");
        });

        DeliveryBatchResult result = provider.sendBatch(List.of(
                message(1L, "token-1"),
                message(1L, "token-2"),
                message(2L, "token-3")));

        assertThat(result.successfulUserIds()).isEmpty();
        assertThat(result.failedUserIds()).containsExactlyInAnyOrder(1L, 2L);
        assertThat(result.retryableUserIds()).isEmpty();
        assertThat(result.invalidTokens()).isEmpty();
    }

    @Test
    void missingTicketsAreExplicitlyRetryableWithoutBeingFailed() {
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(notifications -> List.of(ticket(Status.OK)));

        DeliveryBatchResult result = provider.sendBatch(List.of(
                message(1L, "token-1"),
                message(2L, "token-2")));

        assertThat(result.successfulUserIds()).containsExactlyInAnyOrder(1L);
        assertThat(result.failedUserIds()).isEmpty();
        assertThat(result.retryableUserIds()).containsExactly(2L);
    }

    @Test
    void nullTicketMarksItsUserAsFailed() {
        List<TicketResponse.Ticket> tickets = new ArrayList<>();
        tickets.add(null);
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(notifications -> tickets);

        DeliveryBatchResult result = provider.sendBatch(List.of(message(7L, "token-7")));

        assertThat(result.failedUserIds()).containsExactlyInAnyOrder(7L);
        assertThat(result.retryableUserIds()).isEmpty();
    }

    @Test
    void missingTicketKeepsAUserRetryableDespiteAnotherTokenError() {
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(
                notifications -> List.of(ticket(Status.ERROR)));

        DeliveryBatchResult result = provider.sendBatch(List.of(
                message(7L, "token-7a"),
                message(7L, "token-7b")));

        assertThat(result.successfulUserIds()).isEmpty();
        assertThat(result.failedUserIds()).isEmpty();
        assertThat(result.retryableUserIds()).containsExactly(7L);
    }

    @Test
    void oneSuccessfulTicketWinsOverAnErrorForTheSameUserAndInvalidatesTheDetailedToken() {
        TicketResponse.Ticket error = ticket(Status.ERROR);
        error.setMessage("DeviceNotRegistered");
        TicketResponse.Ticket.Details details = new TicketResponse.Ticket.Details();
        details.setExpoPushToken("rejected-token");
        error.setDetails(details);
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(
                notifications -> List.of(error, ticket(Status.OK)));

        DeliveryBatchResult result = provider.sendBatch(List.of(
                message(9L, "fallback-token"),
                message(9L, "working-token")));

        assertThat(result.successfulUserIds()).containsExactlyInAnyOrder(9L);
        assertThat(result.failedUserIds()).isEmpty();
        assertThat(result.retryableUserIds()).isEmpty();
        assertThat(result.invalidTokens()).containsExactly("rejected-token");
    }

    @Test
    void providerReceivesAtMostOneHundredMessagesWithTheCurrentWireValues() {
        AtomicReference<List<PushNotification>> sent = new AtomicReference<>();
        ExpoPushDeliveryProvider provider = new ExpoPushDeliveryProvider(notifications -> {
            sent.set(List.copyOf(notifications));
            return notifications.stream().map(ignored -> ticket(Status.OK)).toList();
        });
        List<DeliveryMessage> messages = new ArrayList<>();
        for (long index = 1; index <= 101; index++) {
            messages.add(message(index, "token-" + index));
        }

        DeliveryBatchResult result = provider.sendBatch(messages);

        assertThat(sent.get()).hasSize(100);
        assertThat(sent.get().getFirst().getTo()).containsExactly("token-1");
        assertThat(sent.get().getFirst().getTitle()).isEqualTo("Title");
        assertThat(sent.get().getFirst().getBody()).isEqualTo("Body");
        assertThat(sent.get().getFirst().getData()).containsEntry("url", "blockout://match/42");
        assertThat(result.successfulUserIds()).hasSize(100).doesNotContain(101L);
    }

    private static DeliveryMessage message(Long userId, String token) {
        return new DeliveryMessage(
                token,
                "Title",
                "Body",
                Map.of("url", "blockout://match/42"),
                userId,
                42L);
    }

    private static TicketResponse.Ticket ticket(Status status) {
        TicketResponse.Ticket ticket = new TicketResponse.Ticket();
        ticket.setStatus(status);
        return ticket;
    }
}
