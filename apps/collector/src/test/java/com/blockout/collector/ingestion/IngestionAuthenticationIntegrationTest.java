package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.junit.jupiter.api.Assertions.assertTimeout;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.CollectionBackendFailure;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendClient;
import com.blockout.collector.acquisition.infrastructure.backend.CollectionBackendMapperImpl;
import com.blockout.collector.generated.ingestion.ApiClient;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeInternalRequest;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.observation.ObservationRegistry;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientAutoConfiguration;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.oauth2.client.ClientCredentialsOAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

/** Exercises the actual generated client and native OAuth cache against controlled HTTP peers. */
@DisplayName("Collector client credentials and bounded recovery")
class IngestionAuthenticationIntegrationTest {
  private HttpServer server;
  private final AtomicInteger tokens = new AtomicInteger();
  private final AtomicInteger writes = new AtomicInteger();
  private final AtomicReference<String> tokenBody = new AtomicReference<>();
  private final AtomicReference<String> bearer = new AtomicReference<>();
  private volatile int lifetime = 86400;
  private volatile boolean refuseToken;
  private volatile boolean refuseWrite;
  private volatile boolean stallToken;
  private volatile boolean disconnectWrite;
  private final CountDownLatch release = new CountDownLatch(1);
  private ApiClient client;
  private CollectionBackend backend;
  private ClientCredentialsOAuth2AuthorizedClientProvider provider;
  private AnnotationConfigApplicationContext context;
  private ExecutorService peers;

  /**
   * Starts isolated token and business endpoints; neither provider nor production is contacted.
   *
   * @throws Exception if the loopback listener cannot be opened
   */
  @BeforeEach
  void startServer() throws Exception {
    peers = Executors.newVirtualThreadPerTaskExecutor();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.setExecutor(peers);
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
    startClient();
  }

  /**
   * Starts only the production ingestion configuration and native OAuth registration/cache. Each
   * scenario owns its context, clock, peer and connection pool; no collector runner starts.
   */
  private void startClient() {
    String origin = "http://127.0.0.1:" + server.getAddress().getPort();
    context = new AnnotationConfigApplicationContext();
    TestPropertyValues.of(
            "blockout.ingestion.base-url=" + origin,
            "blockout.ingestion.timeout=250ms",
            "blockout.ingestion.audience=ingestion-preproduction",
            "spring.security.oauth2.client.registration.ingestion.provider=auth0",
            "spring.security.oauth2.client.registration.ingestion.client-id=collector-preproduction",
            "spring.security.oauth2.client.registration.ingestion.client-secret=harmless-secret",
            "spring.security.oauth2.client.registration.ingestion.authorization-grant-type=client_credentials",
            "spring.security.oauth2.client.registration.ingestion.client-authentication-method=client_secret_post",
            "spring.security.oauth2.client.registration.ingestion.scope=sporting:ingest",
            "spring.security.oauth2.client.provider.auth0.token-uri=" + origin + "/oauth/token")
        .applyTo(context);
    context.registerBean(ObservationRegistry.class, ObservationRegistry::create);
    context.register(
        IngestionClientConfiguration.class,
        IngestionAuthenticationConfiguration.class,
        OAuth2ClientAutoConfiguration.class);
    context.refresh();
    client = context.getBean(ApiClient.class);
    provider = context.getBean(ClientCredentialsOAuth2AuthorizedClientProvider.class);
    backend =
        new CollectionBackendClient(
            new CollectorOperationsApi(client),
            new CollectionApi(client),
            new CollectionBackendMapperImpl());
  }

  /** Releases blocked handlers before closing this scenario's transport, listener and executor. */
  @AfterEach
  void closePeers() {
    release.countDown();
    try {
      if (context != null) context.close();
    } finally {
      if (server != null) server.stop(0);
      if (peers != null) peers.close();
    }
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

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Classifies failed credentials before a backend write without replaying either request")
  void classifiesUnsentBackendWrite(boolean timeout) {
    // Given
    refuseToken = !timeout;
    stallToken = timeout;
    UUID incarnation = UUID.fromString("00000000-0000-4000-8000-000000000001");

    // When
    Throwable failure = catchThrowable(() -> backend.register(0, incarnation));

    // Then
    assertThat(failure)
        .isInstanceOfSatisfying(
            CollectionBackendFailure.class,
            classified -> {
              assertThat(classified.getKind()).isEqualTo(CollectionBackendFailure.Kind.REJECTED);
              assertThat(classified.getCause()).isInstanceOf(OAuth2AuthorizationException.class);
            });
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
