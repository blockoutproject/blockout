package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.junit.jupiter.api.Assertions.assertTimeout;

import com.blockout.collector.acquisition.infrastructure.CollectorStartup;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeInternalRequest;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.client.ClientCredentialsOAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

/** Exercises the actual generated client and native OAuth cache against controlled HTTP peers. */
@SpringBootTest(properties = "spring.main.keep-alive=false")
@DisplayName("Collector client credentials and bounded recovery")
class IngestionAuthenticationIntegrationTest {
  @MockitoBean private CollectorStartup startup;

  private static HttpServer server;
  private static final AtomicInteger tokens = new AtomicInteger();
  private static final AtomicInteger writes = new AtomicInteger();
  private static final AtomicReference<String> tokenBody = new AtomicReference<>();
  private static final AtomicReference<String> bearer = new AtomicReference<>();
  private static volatile int lifetime;
  private static volatile boolean refuseToken;
  private static volatile boolean refuseWrite;
  private static volatile boolean stallToken;
  private static volatile boolean disconnectWrite;
  private static volatile CountDownLatch release;
  @Autowired private ApiClient client;
  @Autowired private OAuth2AuthorizedClientService clients;
  @Autowired private ClientCredentialsOAuth2AuthorizedClientProvider provider;

  /**
   * Starts isolated token and business endpoints; neither provider nor production is contacted.
   *
   * @throws Exception if the loopback listener cannot be opened
   */
  @BeforeAll
  static void startServer() throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/oauth/token",
        exchange -> {
          int count = tokens.incrementAndGet();
          tokenBody.set(
              URLDecoder.decode(
                  new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8),
                  StandardCharsets.UTF_8));
          if (stallToken) {
            try {
              release.await(3, TimeUnit.SECONDS);
            } catch (InterruptedException failure) {
              Thread.currentThread().interrupt();
            }
            exchange.close();
            return;
          }
          byte[] body =
              (refuseToken
                      ? "{\"error\":\"invalid_client\"}"
                      : "{\"access_token\":\"harmless-token-"
                          + count
                          + "\",\"token_type\":\"Bearer\",\"expires_in\":"
                          + lifetime
                          + ",\"scope\":\"sporting:ingest\"}")
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(refuseToken ? 401 : 200, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    server.createContext(
        "/ingestion/collector-runtime",
        exchange -> {
          writes.incrementAndGet();
          bearer.set(exchange.getRequestHeaders().getFirst("Authorization"));
          exchange.getRequestBody().readAllBytes();
          if (disconnectWrite) {
            exchange.close();
            return;
          }
          boolean accepted = !refuseWrite && bearer.get() != null;
          byte[] body =
              (accepted
                      ? "{\"revision\":1,\"incarnationId\":null}"
                      : "{\"type\":\"urn:blockout:problem:unauthenticated\",\"title\":\"Unauthorized\",\"status\":401}")
                  .getBytes(StandardCharsets.UTF_8);
          exchange
              .getResponseHeaders()
              .add("Content-Type", accepted ? "application/json" : "application/problem+json");
          exchange.sendResponseHeaders(accepted ? 200 : 401, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    server.start();
  }

  /** Releases the test-owned listener after the suite. */
  @AfterAll
  static void stopServer() {
    server.stop(0);
  }

  /**
   * Supplies harmless environment-specific OAuth inputs through native Boot properties.
   *
   * @param properties native test property overrides
   */
  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry properties) {
    properties.add(
        "blockout.ingestion.base-url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
    properties.add("blockout.ingestion.timeout", () -> "250ms");
    properties.add("blockout.ingestion.audience", () -> "ingestion-preproduction");
    properties.add("spring.security.oauth2.client.registration.ingestion.provider", () -> "auth0");
    properties.add(
        "spring.security.oauth2.client.registration.ingestion.client-id",
        () -> "collector-preproduction");
    properties.add(
        "spring.security.oauth2.client.registration.ingestion.client-secret",
        () -> "harmless-secret");
    properties.add(
        "spring.security.oauth2.client.registration.ingestion.authorization-grant-type",
        () -> "client_credentials");
    properties.add(
        "spring.security.oauth2.client.registration.ingestion.client-authentication-method",
        () -> "client_secret_post");
    properties.add(
        "spring.security.oauth2.client.registration.ingestion.scope", () -> "sporting:ingest");
    properties.add(
        "spring.security.oauth2.client.provider.auth0.token-uri",
        () -> "http://127.0.0.1:" + server.getAddress().getPort() + "/oauth/token");
  }

  /** Isolates native cached credentials, time and HTTP observations between scenarios. */
  @BeforeEach
  void resetPeers() {
    clients.removeAuthorizedClient("ingestion", "collector");
    provider.setClock(Clock.systemUTC());
    tokens.set(0);
    writes.set(0);
    tokenBody.set(null);
    bearer.set(null);
    lifetime = 86400;
    refuseToken = false;
    refuseWrite = false;
    stallToken = false;
    disconnectWrite = false;
    release = new CountDownLatch(1);
  }

  /** Releases any intentionally stalled token response after assertions. */
  @AfterEach
  void releaseResponse() {
    release.countDown();
  }

  @Test
  @DisplayName("Requests the selected audience and scope then reuses the provider's 24-hour token")
  void reusesToken() {
    // Given
    CollectorOperationsApi api = new CollectorOperationsApi(client);
    RegisterCollectorRuntimeInternalRequest request =
        new RegisterCollectorRuntimeInternalRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));

    // When
    Throwable failure =
        catchThrowable(
            () -> {
              api.registerCollectorRuntime(request);
              api.registerCollectorRuntime(request);
            });

    // Then
    assertThat(failure).isNull();
    assertThat(tokens).hasValue(1);
    assertThat(writes).hasValue(2);
    assertThat(bearer.get()).isEqualTo("Bearer harmless-token-1");
    assertThat(tokenBody.get())
        .contains(
            "grant_type=client_credentials",
            "client_id=collector-preproduction",
            "client_secret=harmless-secret",
            "scope=sporting:ingest",
            "audience=ingestion-preproduction");
  }

  @Test
  @DisplayName("Renews from actual provider expiry rather than assuming 24 hours")
  void renewsExpiredToken() {
    // Given
    lifetime = 3600;
    CollectorOperationsApi api = new CollectorOperationsApi(client);
    RegisterCollectorRuntimeInternalRequest request =
        new RegisterCollectorRuntimeInternalRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));
    api.registerCollectorRuntime(request);
    provider.setClock(Clock.fixed(Instant.now().plusSeconds(7200), ZoneOffset.UTC));

    // When
    api.registerCollectorRuntime(request);

    // Then
    assertThat(tokens).hasValue(2);
    assertThat(writes).hasValue(2);
    assertThat(bearer.get()).isEqualTo("Bearer harmless-token-2");
  }

  @Test
  @DisplayName("A failed renewal sends no additional business write and makes no token retry")
  void refusesFailedRenewal() {
    // Given
    lifetime = 3600;
    CollectorOperationsApi api = new CollectorOperationsApi(client);
    RegisterCollectorRuntimeInternalRequest request =
        new RegisterCollectorRuntimeInternalRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));
    api.registerCollectorRuntime(request);
    provider.setClock(Clock.fixed(Instant.now().plusSeconds(7200), ZoneOffset.UTC));
    refuseToken = true;

    // When
    Throwable failure = catchThrowable(() -> api.registerCollectorRuntime(request));

    // Then
    assertThat(failure).isInstanceOf(OAuth2AuthorizationException.class);
    assertThat(tokens).hasValue(2);
    assertThat(writes).hasValue(1);
  }

  @Test
  @DisplayName("Bounds a token response wait without sending a business write")
  void boundsTokenFailure() {
    // Given
    stallToken = true;
    CollectorOperationsApi api = new CollectorOperationsApi(client);
    RegisterCollectorRuntimeInternalRequest request =
        new RegisterCollectorRuntimeInternalRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));

    // When
    Throwable failure =
        assertTimeout(
            Duration.ofSeconds(2),
            () -> catchThrowable(() -> api.registerCollectorRuntime(request)));

    // Then
    assertThat(failure).isInstanceOf(OAuth2AuthorizationException.class);
    assertThat(tokens).hasValue(1);
    assertThat(writes).hasValue(0);
  }

  @Test
  @DisplayName(
      "Does not replay an unauthorized write; a later explicit call obtains fresh credentials")
  void doesNotReplayUnauthorizedWrite() {
    // Given
    refuseWrite = true;
    CollectorOperationsApi api = new CollectorOperationsApi(client);
    RegisterCollectorRuntimeInternalRequest request =
        new RegisterCollectorRuntimeInternalRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));

    // When
    Throwable failure = catchThrowable(() -> api.registerCollectorRuntime(request));

    // Then
    assertThat(failure).isInstanceOf(HttpClientErrorException.Unauthorized.class);
    assertThat(tokens).hasValue(1);
    assertThat(writes).hasValue(1);

    // Given
    refuseWrite = false;

    // When
    api.registerCollectorRuntime(request);

    // Then
    assertThat(tokens).hasValue(2);
    assertThat(writes).hasValue(2);
    assertThat(bearer.get()).isEqualTo("Bearer harmless-token-2");
  }

  @Test
  @DisplayName("Does not replay a write whose response was lost after authentication")
  void preservesUncertainWrite() {
    // Given
    disconnectWrite = true;
    CollectorOperationsApi api = new CollectorOperationsApi(client);
    RegisterCollectorRuntimeInternalRequest request =
        new RegisterCollectorRuntimeInternalRequest()
            .revision(0L)
            .incarnationId(UUID.fromString("00000000-0000-4000-8000-000000000001"));

    // When
    Throwable failure = catchThrowable(() -> api.registerCollectorRuntime(request));

    // Then
    assertThat(failure).isInstanceOf(ResourceAccessException.class);
    assertThat(tokens).hasValue(1);
    assertThat(writes).hasValue(1);
  }
}
