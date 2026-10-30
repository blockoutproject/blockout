package com.blockout.backend.notifications.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.niamedtech.expo.exposerversdk.ExpoPushNotificationClient;
import com.niamedtech.expo.exposerversdk.exception.ErrorResponseException;
import com.niamedtech.expo.exposerversdk.request.PushNotification;
import com.niamedtech.expo.exposerversdk.response.ReceiptResponse.Receipt;
import com.niamedtech.expo.exposerversdk.response.TicketResponse.Ticket;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;

/** Real generated SDK mapping with controlled SDK I/O; native HTTP is qualified separately. */
@DisplayName("Expo Java SDK adapter")
class ExpoPushClientTest {
  private final ExpoPushNotificationClient sdk = mock(ExpoPushNotificationClient.class);
  private final ExpoPushClient client =
      new ExpoPushClient(sdk, Mappers.getMapper(ExpoPushMapper.class));
  private final Message message =
      new Message(
          new Target(UUID.randomUUID(), 3, "ExponentPushToken[synthetic]"),
          UUID.randomUUID(),
          UUID.randomUUID(),
          UUID.randomUUID(),
          new NotificationMessage("Sport", "Faits actuels"));

  @Test
  @DisplayName("Maps only safe sporting and routing fields into the native SDK request")
  void mapsNativeRequest() throws Exception {
    // Given
    Ticket ticket = new Ticket();
    ticket.setStatus(com.niamedtech.expo.exposerversdk.response.Status.OK);
    ticket.setId("ticket");
    when(sdk.sendPushNotifications(any())).thenReturn(List.of(ticket));
    ArgumentCaptor<List<PushNotification>> sent = ArgumentCaptor.captor();

    // When
    Outcome result = client.send(List.of(message)).getFirst();

    // Then
    assertThat(result).isEqualTo(new Outcome(Status.ACCEPTED, "ticket"));
    verify(sdk).sendPushNotifications(sent.capture());
    PushNotification request = sent.getValue().getFirst();
    assertThat(request.getTo()).containsExactly(message.target().address());
    assertThat(request.getTitle()).isEqualTo("Sport");
    assertThat(request.getBody()).isEqualTo("Faits actuels");
    assertThat(request.getData())
        .containsExactlyInAnyOrderEntriesOf(
            Map.of(
                "ownerAccountId",
                message.ownerAccountId().toString(),
                "notificationId",
                message.notificationId().toString(),
                "matchId",
                message.matchId().toString()));
    assertThat(request.getBadge()).isNull();
    assertThat(request.getTtl()).isNull();
    assertThat(request.getExpiration()).isNull();
  }

  @Test
  @DisplayName("Refuses batch limits before invoking the SDK")
  void refusesOversizedBatch() {
    // Given
    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable tooManyMessages =
        () -> client.send(Collections.nCopies(101, message));

    // Then
    assertThatThrownBy(tooManyMessages).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> client.receipts(Collections.nCopies(1001, "ticket")))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(sdk);
  }

  @Test
  @DisplayName("Maps missing receipt evidence independently from an invalid destination")
  void mapsReceipts() throws Exception {
    // Given
    Receipt invalid = new Receipt();
    invalid.setStatus(com.niamedtech.expo.exposerversdk.response.Status.ERROR);
    Receipt.Details details = new Receipt.Details();
    details.setError(Receipt.Details.Error.DEVICE_NOT_REGISTERED);
    invalid.setDetails(details);
    when(sdk.getPushNotificationReceipts(List.of("invalid", "missing")))
        .thenReturn(Map.of("invalid", invalid));

    // When
    Map<String, Outcome> outcomes = client.receipts(List.of("invalid", "missing"));

    // Then
    assertThat(outcomes.get("invalid").status()).isEqualTo(Status.DEVICE_NOT_REGISTERED);
    assertThat(outcomes.get("missing").status()).isEqualTo(Status.UNKNOWN);
  }

  @Test
  @DisplayName("Maps the SDK parsed refusal without another SDK attempt")
  void refusesHttpError() throws Exception {
    // Given
    when(sdk.sendPushNotifications(any()))
        .thenThrow(
            new IOException(new ErrorResponseException(429, "controlled refusal", List.of())));

    // When
    Outcome outcome = client.send(List.of(message)).getFirst();

    // Then
    assertThat(outcome.status()).isEqualTo(Status.REJECTED);
    verify(sdk).sendPushNotifications(any());
  }

  @Test
  @DisplayName("A timeout remains uncertain and does not cause another SDK call")
  void keepsTimeoutUncertain() throws Exception {
    // Given
    when(sdk.sendPushNotifications(any()))
        .thenThrow(new java.net.SocketTimeoutException("controlled"));

    // When
    Outcome outcome = client.send(List.of(message)).getFirst();

    // Then
    assertThat(outcome.status()).isEqualTo(Status.UNKNOWN);
    verify(sdk).sendPushNotifications(any());
  }

  @Test
  @DisplayName("Keeps incomplete SDK tickets in their original request positions")
  void preservesMissingTicket() throws Exception {
    // Given
    Ticket invalid = new Ticket();
    invalid.setStatus(com.niamedtech.expo.exposerversdk.response.Status.ERROR);
    Ticket.Details details = new Ticket.Details();
    details.setError(Ticket.Error.DEVICE_NOT_REGISTERED);
    invalid.setDetails(details);
    when(sdk.sendPushNotifications(any())).thenReturn(List.of(invalid));

    // When
    List<Outcome> outcomes = client.send(List.of(message, message));

    // Then
    assertThat(outcomes)
        .extracting(Outcome::status)
        .containsExactly(Status.DEVICE_NOT_REGISTERED, Status.UNKNOWN);
  }

  @Test
  @DisplayName("Accepts a thousand IDs in one native SDK receipt observation")
  void acceptsReceiptLimit() throws Exception {
    // Given
    List<String> ids =
        java.util.stream.IntStream.range(0, 1000).mapToObj(value -> "ticket-" + value).toList();
    when(sdk.getPushNotificationReceipts(ids)).thenReturn(Map.of());

    // When
    Map<String, Outcome> outcomes = client.receipts(ids);

    // Then
    assertThat(outcomes).hasSize(1000);
    assertThat(outcomes.values()).allMatch(value -> value.status() == Status.UNKNOWN);
    verify(sdk).getPushNotificationReceipts(ids);
  }

  @Test
  @DisplayName(
      "An SDK decoding failure loses only receipt evidence without parsing private messages")
  void keepsFailedReceiptUnknown() throws Exception {
    // Given
    when(sdk.getPushNotificationReceipts(any()))
        .thenThrow(new IOException("private provider text"));

    // When
    Map<String, Outcome> outcomes = client.receipts(List.of("ticket"));

    // Then
    assertThat(outcomes.get("ticket").status()).isEqualTo(Status.UNKNOWN);
    verify(sdk).getPushNotificationReceipts(List.of("ticket"));
  }
}
