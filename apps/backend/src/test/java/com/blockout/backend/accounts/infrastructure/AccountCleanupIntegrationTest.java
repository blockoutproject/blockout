package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ClientOptions;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Production native transports against one loopback peer; no credentials or provider are accessed.
 */
@DisplayName("Bounded original provider adapters")
class AccountCleanupIntegrationTest {
  private static final String ORIGINAL_ACCOUNT_ID = "00000000-0000-4000-8000-000000000280";
  private HttpServer server;
  private ExecutorService workers;
  private String origin;
  private final List<String> requests = java.util.Collections.synchronizedList(new ArrayList<>());
  private final CompletableFuture<Void> release = new CompletableFuture<>();
  private int deleteStatus = 204;
  private boolean delay;
  private boolean progressive;
  private boolean disconnect;
  private String redirect;
  private OkHttpClient http;
  private JdkClientHttpRequestFactory revenueRequests;
  private HttpClient revenueHttp;

  /** Opens only a dynamically allocated loopback peer with synthetic responses. */
  @BeforeEach
  void start() throws Exception {
    workers = Executors.newCachedThreadPool();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.setExecutor(workers);
    server.createContext(
        "/",
        exchange -> {
          requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getRawPath());
          exchange.getRequestBody().readAllBytes();
          if (disconnect) {
            exchange.close();
            return;
          }
          try {
            if (delay) {
              release.get(3, TimeUnit.SECONDS);
            }
            if (redirect != null) {
              exchange.getResponseHeaders().set("Location", redirect);
            }
            byte[] body =
                "{\"object\":\"customer\",\"deleted_at\":123}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(deleteStatus, deleteStatus == 204 ? -1 : body.length);
            if (deleteStatus != 204) {
              for (byte value : body) {
                exchange.getResponseBody().write(value);
                if (progressive) {
                  exchange.getResponseBody().flush();
                  try {
                    release.get(50, TimeUnit.MILLISECONDS);
                  } catch (java.util.concurrent.TimeoutException nextByte) {
                    /* Controlled progressive peer. */
                  }
                }
              }
            }
          } catch (Exception ignored) {
            // The intentionally timed-out peer can lose its socket; no provider payload is logged.
          } finally {
            exchange.close();
          }
        });
    server.start();
    origin = "http://127.0.0.1:" + server.getAddress().getPort();
  }

  /**
   * Releases this peer, its blocked responses, owned transports and workers.
   *
   * @throws Exception when the native request factory cannot close its owned pool
   */
  @AfterEach
  void stop() throws Exception {
    release.complete(null);
    if (server != null) {
      server.stop(0);
    }
    if (workers != null) {
      workers.shutdownNow();
    }
    if (http != null) {
      http.connectionPool().evictAll();
      http.dispatcher().executorService().shutdown();
    }
    if (revenueHttp != null) {
      revenueHttp.close();
    }
  }

  @ParameterizedTest(name = "Deletes the original {0} principal")
  @ValueSource(strings = {"auth0", "google-oauth2", "apple"})
  @DisplayName("Auth0 deletes the exact original principal in one request")
  void deletesExactAuth0Target(String identityProvider) {
    // Given
    AccountCleanup.Auth0 cleanup = auth0();

    // When
    Outcome result = cleanup.remove(origin + "/", identityProvider + "|original");

    // Then
    assertThat(result).isEqualTo(Outcome.REMOVED);
    assertThat(requests)
        .containsExactly("DELETE /api/v2/users/" + identityProvider + "%7Coriginal");
  }

  @Test
  @DisplayName("Auth0 acknowledges an already absent original principal")
  void acceptsAbsentAuth0Target() {
    // Given
    deleteStatus = 404;
    AccountCleanup.Auth0 cleanup = auth0();

    // When
    Outcome result = cleanup.remove(origin + "/", "auth0|original");

    // Then
    assertThat(result).isEqualTo(Outcome.ABSENT);
    assertThat(requests).containsExactly("DELETE /api/v2/users/auth0%7Coriginal");
  }

  @Test
  @DisplayName("A foreign issuer causes no Auth0 request")
  void refusesForeignIssuer() {
    // Given
    AccountCleanup.Auth0 cleanup = auth0();

    // When
    Outcome result = cleanup.remove("https://foreign.example.invalid/", "auth0|original");

    // Then
    assertThat(result).isEqualTo(Outcome.UNSAFE_SCOPE);
    assertThat(requests).isEmpty();
  }

  @Test
  @DisplayName("RevenueCat queues one deletion for the supplied original UUID without polling")
  void trustsQueuedRevenueCatAcknowledgment() {
    // Given
    deleteStatus = 200;
    AccountCleanup.RevenueCat cleanup = revenueCat();

    // When
    Outcome result = cleanup.remove(ORIGINAL_ACCOUNT_ID);

    // Then
    assertThat(result).isEqualTo(Outcome.QUEUED);
    assertThat(requests)
        .containsExactly("DELETE /v2/projects/synthetic-project/customers/" + ORIGINAL_ACCOUNT_ID);
  }

  @Test
  @DisplayName("RevenueCat skips cleanup when both credentials are absent")
  void skipsUnconfiguredRevenueCat() {
    // Given
    AccountCleanup.RevenueCat cleanup = revenueCat("", "");

    // When
    Outcome result = cleanup.remove(ORIGINAL_ACCOUNT_ID);

    // Then
    assertThat(result).isEqualTo(Outcome.NOT_CONFIGURED);
    assertThat(requests).isEmpty();
  }

  @ParameterizedTest
  @CsvSource({"synthetic-project, ''", "'', synthetic-secret"})
  @DisplayName("Partial RevenueCat settings cause no request and require attention")
  void refusesPartialRevenueCatSettings(String project, String key) {
    // Given
    AccountCleanup.RevenueCat cleanup = revenueCat(project, key);

    // When
    Outcome result = cleanup.remove(ORIGINAL_ACCOUNT_ID);

    // Then
    assertThat(result).isEqualTo(Outcome.MISSING_CONFIGURATION);
    assertThat(requests).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(ints = {401, 403, 409, 429, 500, 503})
  @DisplayName("RevenueCat refusal has one attempt with no automatic replay")
  void doesNotRetryRefusal(int status) {
    // Given
    deleteStatus = status;
    AccountCleanup.RevenueCat cleanup = revenueCat();

    // When
    Outcome result = cleanup.remove(ORIGINAL_ACCOUNT_ID);

    // Then
    assertThat(result).isEqualTo(Outcome.UNAVAILABLE_OR_UNCERTAIN);
    assertThat(requests).hasSize(1);
  }

  @Test
  @DisplayName("RevenueCat redirects cannot forward the destructive request or credential")
  void refusesRedirect() {
    // Given
    deleteStatus = 307;
    redirect = origin + "/foreign";
    AccountCleanup.RevenueCat cleanup = revenueCat();

    // When
    Outcome result = cleanup.remove(ORIGINAL_ACCOUNT_ID);

    // Then
    assertThat(result).isEqualTo(Outcome.UNAVAILABLE_OR_UNCERTAIN);
    assertThat(requests).hasSize(1);
  }

  @Test
  @DisplayName("A stalled RevenueCat response stops at its native deadline without a retry")
  void boundsRevenueCatWait() {
    // Given
    delay = true;
    AccountCleanup.RevenueCat cleanup = revenueCat();

    // When / Then
    assertThatThrownBy(() -> cleanup.remove(ORIGINAL_ACCOUNT_ID))
        .isInstanceOf(org.springframework.web.client.ResourceAccessException.class);
    assertThat(requests).hasSize(1);
  }

  @Test
  @DisplayName("A dispatched DELETE whose response is lost is not replayed")
  void doesNotReplayLostResponse() {
    // Given
    disconnect = true;
    AccountCleanup.RevenueCat cleanup = revenueCat();

    // When / Then
    assertThatThrownBy(() -> cleanup.remove(ORIGINAL_ACCOUNT_ID))
        .isInstanceOf(org.springframework.web.client.ResourceAccessException.class);
    assertThat(requests).hasSize(1);
  }

  @Test
  @DisplayName(
      "A progressing RevenueCat body cannot retain cleanup beyond the native total deadline")
  void boundsProgressingBody() throws Exception {
    // Given: byte pacing prevents an inactivity timeout; the complete peer body takes over 1 s.
    deleteStatus = 200;
    progressive = true;
    AccountCleanup.RevenueCat cleanup = revenueCat();
    try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
      java.util.concurrent.Future<Outcome> outcome =
          caller.submit(() -> cleanup.remove(ORIGINAL_ACCOUNT_ID));
      try {
        // When
        Outcome result = outcome.get(1, TimeUnit.SECONDS);

        // Then: the documented 200 acknowledgment remains successful without waiting for its body.
        assertThat(result).isEqualTo(Outcome.QUEUED);
        assertThat(requests).hasSize(1);
      } finally {
        release.complete(null);
      }
    }
  }

  /**
   * Builds the production Auth0 native transport over this synthetic peer, with SDK retries off.
   *
   * @return real SDK cleanup adapter
   */
  private AccountCleanup.Auth0 auth0() {
    http =
        new Auth0Configuration()
            .auth0ManagementHttp(
                new Auth0Properties(
                    URI.create(origin + "/api/v2/"),
                    Duration.ofMillis(100),
                    Duration.ofMillis(300)));
    ManagementApi client =
        new ManagementApi(
            ClientOptions.builder()
                .environment(com.auth0.client.mgmt.core.Environment.custom(origin + "/api/v2/"))
                .httpClient(http)
                .maxRetries(0)
                .addHeader("Authorization", "Bearer synthetic-token")
                .build());
    return new Auth0AccountCleanup(Optional.of(client), origin + "/");
  }

  private AccountCleanup.RevenueCat revenueCat() {
    return revenueCat("synthetic-project", "synthetic-secret");
  }

  /**
   * Builds the actual no-retry/no-redirect RevenueCat factory and adapter.
   *
   * @param project synthetic project ID or an empty setting
   * @param key synthetic server key or an empty setting
   * @return real native REST adapter
   */
  private AccountCleanup.RevenueCat revenueCat(String project, String key) {
    AccountCleanupConfiguration configuration = new AccountCleanupConfiguration();
    AccountCleanupProperties properties = properties(project, key);
    revenueHttp = configuration.revenueCatCleanupHttp(properties);
    revenueRequests = configuration.revenueCatCleanupRequests(properties, revenueHttp);
    return configuration.revenueCatAccountCleanup(
        RestClient.builder(), revenueRequests, properties);
  }

  private AccountCleanupProperties properties(String project, String key) {
    return new AccountCleanupProperties(
        URI.create(origin + "/v2"), project, key, Duration.ofMillis(100), Duration.ofMillis(300));
  }
}
