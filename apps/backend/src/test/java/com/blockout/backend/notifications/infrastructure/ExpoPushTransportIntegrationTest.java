package com.blockout.backend.notifications.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.notifications.application.PushProvider;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.niamedtech.expo.exposerversdk.ExpoPushNotificationClient;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.springframework.boot.http.client.HttpClientSettings;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Actual SDK, production native transport and serialization against disposable loopback HTTP. */
@DisplayName("Expo Java SDK single native HTTP attempt")
class ExpoPushTransportIntegrationTest {
  @ParameterizedTest
  @CsvSource({"send,429", "send,503", "getReceipts,429", "getReceipts,503"})
  @DisplayName("A native refusal never replays a send or receipt POST")
  void refusesNativeReplay(String operation, int refusal) throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger requests = new AtomicInteger();
    AtomicReference<String> body = new AtomicReference<>();
    AtomicReference<String> authorization = new AtomicReference<>();
    server.createContext(
        "/push/",
        exchange -> {
          body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
          int attempt = requests.incrementAndGet();
          // An empty refusal body must still be classified from the native HTTP status.
          byte[] response =
              attempt == 1 ? new byte[0] : "{\"data\":[]}".getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(attempt == 1 ? refusal : 200, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    try (CloseableHttpClient http =
        new PushDeliveryConfiguration()
            .pushHttpClient(
                HttpClientSettings.defaults()
                    .withConnectTimeout(Duration.ofSeconds(3))
                    .withReadTimeout(Duration.ofSeconds(5)))) {
      ExpoPushNotificationClient sdk =
          new PushDeliveryConfiguration()
              .expoPushSdkBuilder(
                  http,
                  new PushProperties(
                      true,
                      UUID.fromString("00000000-0000-4000-8000-000000000001"),
                      "synthetic-not-a-credential"))
              .setBaseUri("http://127.0.0.1:" + server.getAddress().getPort())
              .build();
      PushProvider provider = new ExpoPushClient(sdk, Mappers.getMapper(ExpoPushMapper.class));
      Message message =
          new Message(
              new Target(UUID.randomUUID(), 1, "ExponentPushToken[synthetic]"),
              UUID.randomUUID(),
              UUID.randomUUID(),
              UUID.randomUUID(),
              new NotificationMessage("Sport", "Faits actuels"));

      // When
      Status outcome =
          operation.equals("send")
              ? provider.send(List.of(message)).getFirst().status()
              : provider.receipts(List.of("ticket")).get("ticket").status();

      // Then
      assertThat(requests.get()).isEqualTo(1);
      assertThat(outcome).isEqualTo(Status.REJECTED);
      assertThat(authorization.get()).isEqualTo("Bearer synthetic-not-a-credential");
      JsonNode payload = JsonMapper.builder().build().readTree(body.get());
      if (operation.equals("send")) {
        JsonNode notification = payload.get(0);
        assertThat(notification.size()).isEqualTo(4);
        assertThat(notification.path("to").get(0).asString()).isEqualTo(message.target().address());
        assertThat(notification.path("title").asString()).isEqualTo("Sport");
        assertThat(notification.path("body").asString()).isEqualTo("Faits actuels");
        assertThat(notification.path("data").size()).isEqualTo(3);
        assertThat(notification.path("data").path("ownerAccountId").asString())
            .isEqualTo(message.ownerAccountId().toString());
        assertThat(notification.has("badge")).isFalse();
        assertThat(notification.has("ttl")).isFalse();
        assertThat(notification.has("expiration")).isFalse();
      } else {
        assertThat(payload.path("ids").get(0).asString()).isEqualTo("ticket");
      }
    } finally {
      server.stop(0);
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"send", "getReceipts"})
  @DisplayName("Uses the actual SDK decoder for partial tickets and receipts")
  void mapsNativePartialEvidence(String operation) throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/push/",
        exchange -> {
          exchange.getRequestBody().readAllBytes();
          requests.incrementAndGet();
          String response =
              operation.equals("send")
                  ? "{\"data\":[{\"status\":\"ok\",\"id\":\"accepted\"},{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}]}"
                  : "{\"data\":{\"other\":{\"status\":\"error\",\"details\":{\"error\":\"MismatchSenderId\"}},\"invalid\":{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}}}";
          byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    try (CloseableHttpClient http =
        new PushDeliveryConfiguration().pushHttpClient(HttpClientSettings.defaults())) {
      ExpoPushNotificationClient sdk =
          new PushDeliveryConfiguration()
              .expoPushSdkBuilder(
                  http,
                  new PushProperties(
                      true,
                      UUID.fromString("00000000-0000-4000-8000-000000000001"),
                      "synthetic-not-a-credential"))
              .setBaseUri("http://127.0.0.1:" + server.getAddress().getPort())
              .build();
      PushProvider provider = new ExpoPushClient(sdk, Mappers.getMapper(ExpoPushMapper.class));
      Message message =
          new Message(
              new Target(UUID.randomUUID(), 1, "ExponentPushToken[synthetic]"),
              UUID.randomUUID(),
              UUID.randomUUID(),
              UUID.randomUUID(),
              new NotificationMessage("Sport", "Faits actuels"));

      // When
      List<Status> outcomes;
      if (operation.equals("send")) {
        outcomes =
            provider.send(List.of(message, message)).stream()
                .map(PushProvider.Outcome::status)
                .toList();
      } else {
        Map<String, PushProvider.Outcome> receipts =
            provider.receipts(List.of("other", "invalid", "missing"));
        outcomes = List.of(receipts.get("other").status(), receipts.get("invalid").status());
      }

      // Then
      assertThat(requests.get()).isEqualTo(1);
      if (operation.equals("send"))
        assertThat(outcomes).containsExactly(Status.ACCEPTED, Status.DEVICE_NOT_REGISTERED);
      else assertThat(outcomes).containsExactly(Status.REJECTED, Status.DEVICE_NOT_REGISTERED);
    } finally {
      server.stop(0);
    }
  }
}
