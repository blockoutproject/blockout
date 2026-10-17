package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.junit.jupiter.api.Assertions.assertTimeout;

import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.model.GetCollectionWork200Response;
import com.blockout.collector.generated.ingestion.model.GetCollectionWork200ResponseControlsInner;
import com.blockout.collector.generated.ingestion.model.GetCollectorRuntime200Response;
import com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeRequest;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
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
  private final CountDownLatch releaseResponse = new CountDownLatch(1);
  private HttpComponentsClientHttpRequestFactory factory;

  /**
   * Starts a local controlled endpoint; no supplier or business backend is contacted.
   *
   * @throws IOException if the loopback listener cannot be opened
   */
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
              releaseResponse.await(3, TimeUnit.SECONDS);
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
    factory = configuration.ingestionRequestFactory(Duration.ofMillis(250));
    ApiClient client =
        configuration.ingestionApiClient(
            factory,
            "http://127.0.0.1:" + server.getAddress().getPort(),
            new ClassPathResource("contracts/ingestion.yaml"));
    client.setBearerToken("harmless-test-token");
    api = new CollectionApi(client);
  }

  /**
   * Releases the listener, stalled response and client pool after each scenario.
   *
   * @throws Exception if the client pool cannot be closed
   */
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

    // When
    Throwable failure = catchThrowable(() -> api.getCollectorRuntime());

    // Then
    assertThat(failure).isInstanceOf(RestClientException.class);
  }

  @ParameterizedTest
  @CsvSource({"future,2026-10-16T12:00:00Z", "ffvb,2026-02-31T12:00:00Z", "ffvb,not-a-date"})
  @DisplayName("Rejects unknown enums or invalid nested dates")
  void rejectsInvalidNestedWork(String family, String date) {
    // Given
    UUID incarnationId = UUID.fromString("00000000-0000-4000-8000-000000000001");
    body =
        """
        {
          "controls": [{
            "id": "00000000-0000-4000-8000-000000000002",
            "family": "%s",
            "revision": 0,
            "enabled": true,
            "lastStartedAt": "%s"
          }],
          "validations": []
        }
        """
            .formatted(family, date);

    // When
    Throwable failure = catchThrowable(() -> api.getCollectionWork(incarnationId));

    // Then
    assertThat(failure).isInstanceOf(RestClientException.class);
  }

  @Test
  @DisplayName("Accepts valid nested fields and additive nested response data")
  void acceptsNestedWork() {
    // Given
    UUID incarnationId = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID controlId = UUID.fromString("00000000-0000-4000-8000-000000000002");
    body =
        """
        {
          "controls": [{
            "id": "%s",
            "family": "ffvb",
            "revision": 7,
            "enabled": true,
            "lastStartedAt": "2026-10-16T12:00:00Z",
            "future": true
          }],
          "validations": []
        }
        """
            .formatted(controlId);

    // When
    GetCollectionWork200Response result = api.getCollectionWork(incarnationId);

    // Then
    assertThat(result.getControls())
        .singleElement()
        .satisfies(
            control -> {
              assertThat(control.getId()).isEqualTo(controlId);
              assertThat(control.getFamily())
                  .isEqualTo(GetCollectionWork200ResponseControlsInner.FamilyEnum.FFVB);
              assertThat(control.getRevision()).isEqualTo(7L);
              assertThat(control.getEnabled()).isTrue();
              assertThat(control.getLastStartedAt())
                  .isEqualTo(OffsetDateTime.parse("2026-10-16T12:00:00Z"));
            });
    assertThat(result.getValidations()).isEmpty();
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

    // When
    Throwable failure =
        assertTimeout(
            Duration.ofSeconds(2),
            () -> catchThrowable(() -> api.registerCollectorRuntime(request)));

    // Then
    assertThat(failure).isInstanceOf(RestClientException.class);
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

    // When
    Throwable failure = catchThrowable(() -> api.registerCollectorRuntime(request));

    // Then
    assertThat(failure).isInstanceOf(RestClientException.class);
    assertThat(calls).hasValue(1);
  }
}
