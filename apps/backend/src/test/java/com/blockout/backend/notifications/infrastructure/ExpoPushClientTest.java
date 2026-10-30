package com.blockout.backend.notifications.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationMessage;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Real RestClient serialization with a controlled HTTP boundary, no provider credentials. */
@DisplayName("Expo HTTP send and receipt adapter")
class ExpoPushClientTest {
  private final RestClient.Builder builder = RestClient.builder();
  private final MockRestServiceServer http = MockRestServiceServer.bindTo(builder).build();
  private final ExpoPushClient client =
      new ExpoPushClient(builder.build(), JsonMapper.builder().build());
  private final Message message =
      new Message(
          new Target(UUID.randomUUID(), 3, "ExponentPushToken[synthetic]"),
          UUID.randomUUID(),
          UUID.randomUUID(),
          UUID.randomUUID(),
          new NotificationMessage("Sport", "Faits actuels"));

  @Test
  @DisplayName("Serializes safe routing and parses partial tickets by request position")
  void parsesPartialTickets() {
    // Given
    http.expect(requestTo("/send"))
        .andExpect(
            content()
                .json(
                    "[{\"to\":\"ExponentPushToken[synthetic]\",\"title\":\"Sport\",\"body\":\"Faits actuels\",\"data\":{\"ownerAccountId\":\""
                        + message.ownerAccountId()
                        + "\",\"notificationId\":\""
                        + message.notificationId()
                        + "\",\"matchId\":\""
                        + message.matchId()
                        + "\"}}]",
                    true))
        .andRespond(
            withSuccess(
                "{\"data\":[{\"status\":\"ok\",\"id\":\"ticket\"}]}", MediaType.APPLICATION_JSON));

    // When
    com.blockout.backend.notifications.application.PushProvider.Outcome result =
        client.send(List.of(message)).getFirst();

    // Then
    assertThat(result.status()).isEqualTo(Status.ACCEPTED);
    assertThat(result.ticketId()).isEqualTo("ticket");
    http.verify();
  }

  @Test
  @DisplayName("Refuses provider limits before any HTTP call")
  void refusesOversizedWork() {
    // Given
    Message oversized =
        new Message(
            message.target(),
            message.ownerAccountId(),
            message.notificationId(),
            message.matchId(),
            new NotificationMessage("Sport", "é".repeat(4096)));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable tooManyMessages =
        () -> client.send(Collections.nCopies(101, message));

    // Then
    assertThatThrownBy(tooManyMessages).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> client.send(List.of(oversized)))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> client.receipts(Collections.nCopies(1001, "ticket")))
        .isInstanceOf(IllegalArgumentException.class);
    http.verify();
  }

  @Test
  @DisplayName("Keeps a missing receipt unknown while identifying the invalid destination")
  void parsesReceipts() {
    // Given
    http.expect(requestTo("/getReceipts"))
        .andExpect(content().json("{\"ids\":[\"invalid\",\"missing\"]}"))
        .andRespond(
            withSuccess(
                "{\"data\":{\"invalid\":{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}}}",
                MediaType.APPLICATION_JSON));

    // When
    java.util.Map<String, com.blockout.backend.notifications.application.PushProvider.Outcome>
        results = client.receipts(List.of("invalid", "missing"));

    // Then
    assertThat(results.get("invalid").status()).isEqualTo(Status.DEVICE_NOT_REGISTERED);
    assertThat(results.get("missing").status()).isEqualTo(Status.UNKNOWN);
    http.verify();
  }

  @Test
  @DisplayName("Rejects a refused batch without retrying the provider")
  void refusesHttpError() {
    // Given
    http.expect(requestTo("/send"))
        .andRespond(withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS));

    // When
    List<com.blockout.backend.notifications.application.PushProvider.Outcome> outcomes =
        client.send(List.of(message));

    // Then
    assertThat(outcomes.getFirst().status()).isEqualTo(Status.REJECTED);
    http.verify();
  }

  @Test
  @DisplayName("Treats a timeout as uncertain without retrying")
  void keepsTimeoutUncertain() {
    // Given
    http.expect(requestTo("/send"))
        .andRespond(withException(new java.net.SocketTimeoutException("controlled")));

    // When
    List<com.blockout.backend.notifications.application.PushProvider.Outcome> outcomes =
        client.send(List.of(message));

    // Then
    assertThat(outcomes.getFirst().status()).isEqualTo(Status.UNKNOWN);
    http.verify();
  }

  @Test
  @DisplayName("Preserves positional outcomes when the response omits later tickets")
  void preservesMissingTicket() {
    // Given
    http.expect(requestTo("/send"))
        .andRespond(
            withSuccess(
                "{\"data\":[{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}]}",
                MediaType.APPLICATION_JSON));

    // When
    List<com.blockout.backend.notifications.application.PushProvider.Outcome> outcomes =
        client.send(List.of(message, message));

    // Then
    assertThat(outcomes)
        .extracting(com.blockout.backend.notifications.application.PushProvider.Outcome::status)
        .containsExactly(Status.DEVICE_NOT_REGISTERED, Status.UNKNOWN);
    http.verify();
  }

  @Test
  @DisplayName("Parses explicit whole-request errors as rejection without splitting or retry")
  void rejectsProviderErrorEnvelope() {
    // Given
    http.expect(requestTo("/send"))
        .andRespond(
            withSuccess(
                "{\"errors\":[{\"code\":\"PUSH_TOO_MANY_EXPERIENCE_IDS\"}]}",
                MediaType.APPLICATION_JSON));

    // When
    List<com.blockout.backend.notifications.application.PushProvider.Outcome> outcomes =
        client.send(List.of(message));

    // Then
    assertThat(outcomes.getFirst().status()).isEqualTo(Status.REJECTED);
    http.verify();
  }

  @Test
  @DisplayName("Accepts a thousand receipt IDs in one observation")
  void acceptsReceiptLimit() {
    // Given
    List<String> ids =
        java.util.stream.IntStream.range(0, 1000).mapToObj(value -> "ticket-" + value).toList();
    http.expect(requestTo("/getReceipts"))
        .andRespond(withSuccess("{\"data\":{}}", MediaType.APPLICATION_JSON));

    // When
    java.util.Map<String, com.blockout.backend.notifications.application.PushProvider.Outcome>
        outcomes = client.receipts(ids);

    // Then
    assertThat(outcomes).hasSize(1000);
    assertThat(outcomes.values()).allMatch(value -> value.status() == Status.UNKNOWN);
    http.verify();
  }
}
