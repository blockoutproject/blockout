package com.blockout.backend.notifications.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.notifications.application.PushProvider;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Actual production HTTP factory and JSON writes against a disposable loopback server. */
@DisplayName("Expo single native HTTP attempt")
class ExpoPushTransportIntegrationTest {
  @ParameterizedTest
  @CsvSource({"send,429", "send,503", "getReceipts,429", "getReceipts,503"})
  @DisplayName("A native refusal never replays a send or receipt POST")
  void refusesNativeReplay(String operation, int refusal) throws Exception {
    // Given
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    AtomicInteger requests = new AtomicInteger();
    server.createContext(
        "/",
        exchange -> {
          exchange.getRequestBody().readAllBytes();
          assertThat(exchange.getRequestHeaders().getFirst("Authorization"))
              .isEqualTo("Bearer synthetic-not-a-credential");
          int attempt = requests.incrementAndGet();
          byte[] response =
              "{\"data\":[{\"status\":\"ok\",\"id\":\"ticket\"}]}".getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(attempt == 1 ? refusal : 200, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    PushDeliveryConfiguration configuration = new PushDeliveryConfiguration();
    HttpComponentsClientHttpRequestFactory factory =
        configuration.pushRequestFactory(
            HttpClientSettings.defaults()
                .withConnectTimeout(Duration.ofSeconds(3))
                .withReadTimeout(Duration.ofSeconds(5)));
    try {
      // Route only this test's production factory to loopback; no external provider is reachable.
      ClientHttpRequestFactory loopback =
          (uri, method) ->
              factory.createRequest(
                  URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/" + operation),
                  method);
      PushProvider provider =
          configuration.expoPushClient(
              RestClient.builder(),
              new PushProperties(
                  true,
                  UUID.fromString("00000000-0000-4000-8000-000000000001"),
                  "synthetic-not-a-credential"),
              JsonMapper.builder().build(),
              loopback);
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
    } finally {
      factory.destroy();
      server.stop(0);
    }
  }
}
