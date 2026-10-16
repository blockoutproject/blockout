package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.model.GetCollectorRuntime200Response;
import com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeRequest;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.client.RestClientException;

/** Exercises real generated serialization and decoding against an isolated HTTP server. */
@DisplayName("Generated ingestion client boundary")
class GeneratedClientTest {
  private HttpServer server;
  private CollectionApi api;
  private String body;
  private final AtomicInteger calls = new AtomicInteger();
  private boolean disconnect;
  private boolean stall;
  private final java.util.concurrent.CountDownLatch releaseResponse =
      new java.util.concurrent.CountDownLatch(1);
  private org.springframework.http.client.HttpComponentsClientHttpRequestFactory factory;

  /** Starts a local controlled endpoint; no supplier or business backend is contacted. */
  @BeforeEach
  void startServer() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/ingestion",
        exchange -> {
          calls.incrementAndGet();
          exchange.getRequestBody().readAllBytes();
          if (stall) {
            try {
              releaseResponse.await(3, java.util.concurrent.TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
              Thread.currentThread().interrupt();
            }
            exchange.close();
            return;
          }
          if (disconnect) {
            exchange.close();
            return;
          }
          byte[] response = body.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.getResponseHeaders().add("Cache-Control", "no-store");
          exchange.sendResponseHeaders(200, response.length);
          exchange.getResponseBody().write(response);
          exchange.close();
        });
    server.start();
    IngestionClientConfiguration configuration = new IngestionClientConfiguration();
    factory = configuration.ingestionRequestFactory(java.time.Duration.ofMillis(250));
    ApiClient client =
        configuration.ingestionApiClient(
            factory,
            "http://127.0.0.1:" + server.getAddress().getPort(),
            new org.springframework.core.io.ClassPathResource("contracts/ingestion.yaml"));
    client.setBearerToken("harmless-test-token");
    api = new CollectionApi(client);
  }

  /** Releases the local HTTP listener after every independently controlled scenario. */
  @AfterEach
  void stopServer() throws Exception {
    releaseResponse.countDown();
    server.stop(0);
    if (factory != null) factory.destroy();
  }

  @Test
  @DisplayName("Accepts a required null and additive response properties")
  void acceptsRequiredNull() {
    // Given
    body = "{\"revision\":0,\"incarnationId\":null,\"future\":true}";

    // When
    GetCollectorRuntime200Response result = api.getCollectorRuntime();

    // Then
    assertThat(result.getRevision()).isZero();
    assertThat(result.getIncarnationId()).isNull();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":0}",
        "{\"revision\":null,\"incarnationId\":null}",
        "{\"revision\":\"0\",\"incarnationId\":null}",
        "{\"revision\":-1,\"incarnationId\":null}",
        "{\"revision\":0,\"incarnationId\":\"bad-uuid\"}",
        "{"
      })
  @DisplayName("Rejects missing required fields and invalid known values")
  void rejectsInvalidRuntime(String response) {
    // Given
    body = response;

    // When / Then
    assertThatThrownBy(() -> api.getCollectorRuntime()).isInstanceOf(RestClientException.class);
  }

  @ParameterizedTest
  @CsvSource({"future,2026-10-16T12:00:00Z", "ffvb,2026-02-31T12:00:00Z", "ffvb,not-a-date"})
  @DisplayName("Rejects unknown enums or invalid nested dates")
  void rejectsInvalidNestedWork(String family, String date) {
    // Given
    body =
        "{\"controls\":[{\"id\":\"00000000-0000-4000-8000-000000000001\",\"family\":\""
            + family
            + "\",\"revision\":0,\"enabled\":true,\"lastStartedAt\":\""
            + date
            + "\"}],\"validations\":[]}";

    // When / Then
    assertThatThrownBy(
            () -> api.getCollectionWork(UUID.fromString("00000000-0000-4000-8000-000000000001")))
        .isInstanceOf(RestClientException.class);
  }

  @Test
  @DisplayName("Accepts valid nested fields and additive nested response data")
  void acceptsNestedWork() {
    // Given
    body =
        "{\"controls\":[{\"id\":\"00000000-0000-4000-8000-000000000001\",\"family\":\"ffvb\",\"revision\":0,\"enabled\":true,\"lastStartedAt\":\"2026-10-16T12:00:00Z\",\"future\":true}],\"validations\":[]}";

    // When / Then
    assertThat(
            api.getCollectionWork(UUID.fromString("00000000-0000-4000-8000-000000000001"))
                .getControls())
        .hasSize(1);
  }

  @Test
  @DisplayName("Bounds a write waiting for its response without replay")
  void boundsUncertainWrite() {
    // Given
    stall = true;
    RegisterCollectorRuntimeRequest request =
        new RegisterCollectorRuntimeRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));

    // When / Then
    org.junit.jupiter.api.Assertions.assertTimeout(
        java.time.Duration.ofSeconds(2),
        () ->
            assertThatThrownBy(() -> api.registerCollectorRuntime(request))
                .isInstanceOf(RestClientException.class));
    assertThat(calls).hasValue(1);
  }

  @Test
  @DisplayName("Does not replay a write whose response was lost")
  void doesNotReplayUncertainWrite() {
    // Given
    disconnect = true;
    RegisterCollectorRuntimeRequest request =
        new RegisterCollectorRuntimeRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));

    // When / Then
    assertThatThrownBy(() -> api.registerCollectorRuntime(request))
        .isInstanceOf(RestClientException.class);
    assertThat(calls).hasValue(1);
  }
}
