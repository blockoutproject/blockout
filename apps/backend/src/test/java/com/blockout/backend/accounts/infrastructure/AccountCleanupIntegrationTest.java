package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.auth0.client.mgmt.ManagementApi;
import com.auth0.client.mgmt.core.ClientOptions;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import com.blockout.backend.accounts.infrastructure.AccountCleanupProperties.Environment;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Production native transports against one loopback peer; no credentials or provider are accessed.
 */
@DisplayName("Bounded original provider adapters")
class AccountCleanupIntegrationTest {
  private HttpServer server;
  private ExecutorService workers;
  private String origin;
  private final List<String> requests = java.util.Collections.synchronizedList(new ArrayList<>());
  private final CompletableFuture<Void> release = new CompletableFuture<>();
  private String identities = "[{\"provider\":\"auth0\",\"connection\":\"isolated-test\"}]";
  private int deleteStatus = 204;
  private boolean delay;
  private String redirect;
  private OkHttpClient http;
  private HttpComponentsClientHttpRequestFactory revenueRequests;

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
          try {
            if (delay) release.get(3, TimeUnit.SECONDS);
            if (redirect != null) exchange.getResponseHeaders().set("Location", redirect);
            byte[] body =
                exchange.getRequestMethod().equals("GET")
                    ? ("{\"user_id\":\"auth0|original\",\"identities\":" + identities + "}")
                        .getBytes(StandardCharsets.UTF_8)
                    : "{\"object\":\"customer\",\"deleted_at\":123}"
                        .getBytes(StandardCharsets.UTF_8);
            int status = exchange.getRequestMethod().equals("GET") ? 200 : deleteStatus;
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, status == 204 ? -1 : body.length);
            if (status != 204) exchange.getResponseBody().write(body);
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
    if (server != null) server.stop(0);
    if (workers != null) workers.shutdownNow();
    if (http != null) {
      http.connectionPool().evictAll();
      http.dispatcher().executorService().shutdown();
    }
    if (revenueRequests != null) revenueRequests.destroy();
  }

  @Test
  @DisplayName("Auth0 deletes the exact original principal through the official installed SDK")
  void deletesExactAuth0Target() {
    // Given
    AccountCleanup.Auth0 cleanup = auth0(Environment.PREPRODUCTION);

    // When
    Outcome result = cleanup.remove(origin + "/", "auth0|original");

    // Then
    assertThat(result).isEqualTo(Outcome.REMOVED);
    assertThat(requests)
        .containsExactly(
            "GET /api/v2/users/auth0%7Coriginal", "DELETE /api/v2/users/auth0%7Coriginal");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "[]",
        "[{\"provider\":\"auth0\",\"connection\":\"foreign\"}]",
        "[{\"provider\":\"auth0\",\"connection\":\"isolated-test\"},{\"provider\":\"apple\",\"connection\":\"apple\"}]",
        "[{\"provider\":\"auth0\"}]"
      })
  @DisplayName("Preproduction refuses absent, foreign or linked social identity scope")
  void refusesUnsafeIdentity(String evidence) {
    // Given
    identities = evidence;
    AccountCleanup.Auth0 cleanup = auth0(Environment.PREPRODUCTION);

    // When
    Outcome result = cleanup.remove(origin + "/", "auth0|original");

    // Then
    assertThat(result).isEqualTo(Outcome.UNSAFE_SCOPE);
    assertThat(requests).containsExactly("GET /api/v2/users/auth0%7Coriginal");
  }

  @Test
  @DisplayName("Production linked Apple and Google use Auth0's documented deletion/revocation path")
  void delegatesApplicableAppleRevocation() {
    // Given
    identities =
        "[{\"provider\":\"apple\",\"connection\":\"apple\"},{\"provider\":\"google-oauth2\",\"connection\":\"google-oauth2\"}]";
    AccountCleanup.Auth0 cleanup = auth0(Environment.PRODUCTION);

    // When
    Outcome result = cleanup.remove(origin + "/", "auth0|original");

    // Then
    assertThat(result).isEqualTo(Outcome.REMOVED);
    assertThat(requests).hasSize(2);
  }

  @Test
  @DisplayName("Missing activation or wrong issuer performs no Auth0 request")
  void refusesUnknownEnvironment() {
    // Given
    AccountCleanup.Auth0 disabled = auth0(Environment.DISABLED);

    // When
    Outcome missing = disabled.remove(origin + "/", "auth0|original");
    Outcome foreign =
        auth0(Environment.PREPRODUCTION)
            .remove("https://foreign.example.invalid/", "auth0|original");

    // Then
    assertThat(missing).isEqualTo(Outcome.MISSING_CONFIGURATION);
    assertThat(foreign).isEqualTo(Outcome.UNSAFE_SCOPE);
    assertThat(requests).isEmpty();
  }

  @Test
  @DisplayName("RevenueCat 200 is a successful queued deletion with no completion poll")
  void trustsQueuedRevenueCatAcknowledgment() {
    // Given
    deleteStatus = 200;
    AccountCleanup.RevenueCat cleanup = revenueCat(Environment.PREPRODUCTION);

    // When
    Outcome result = cleanup.remove("known-original");

    // Then
    assertThat(result).isEqualTo(Outcome.QUEUED);
    assertThat(requests)
        .containsExactly("DELETE /v2/projects/synthetic-project/customers/known-original");
  }

  @Test
  @DisplayName("A RevenueCat customer outside the verified test set is never deleted")
  void refusesUnprovenCustomerScope() {
    // Given
    AccountCleanup.RevenueCat cleanup = revenueCat(Environment.PREPRODUCTION);

    // When
    Outcome result = cleanup.remove("foreign-original");

    // Then
    assertThat(result).isEqualTo(Outcome.UNSAFE_SCOPE);
    assertThat(requests).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(ints = {401, 403, 409, 429, 500, 503})
  @DisplayName("RevenueCat refusal has one attempt with no automatic replay")
  void doesNotRetryRefusal(int status) {
    // Given
    deleteStatus = status;
    AccountCleanup.RevenueCat cleanup = revenueCat(Environment.PREPRODUCTION);

    // When
    Outcome result = cleanup.remove("known-original");

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
    AccountCleanup.RevenueCat cleanup = revenueCat(Environment.PREPRODUCTION);

    // When
    Outcome result = cleanup.remove("known-original");

    // Then
    assertThat(result).isEqualTo(Outcome.UNAVAILABLE_OR_UNCERTAIN);
    assertThat(requests).hasSize(1);
  }

  @Test
  @DisplayName("A stalled RevenueCat response stops at its native deadline without a retry")
  void boundsRevenueCatWait() {
    // Given
    delay = true;
    AccountCleanup.RevenueCat cleanup = revenueCat(Environment.PREPRODUCTION);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable remove =
        () -> cleanup.remove("known-original");

    // Then
    org.assertj.core.api.Assertions.assertThatThrownBy(remove)
        .isInstanceOf(org.springframework.web.client.ResourceAccessException.class);
    assertThat(requests).hasSize(1);
  }

  /**
   * Builds the production Auth0 native transport over this synthetic peer, with SDK retries off.
   *
   * @param environment explicit operation scope
   * @return real SDK cleanup adapter
   */
  private AccountCleanup.Auth0 auth0(Environment environment) {
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
    return new Auth0AccountCleanup(Optional.of(client), properties(environment), origin + "/");
  }

  /**
   * Builds the actual no-retry/no-redirect RevenueCat factory and adapter.
   *
   * @param environment explicit operation scope
   * @return real native REST adapter
   */
  private AccountCleanup.RevenueCat revenueCat(Environment environment) {
    AccountCleanupConfiguration configuration = new AccountCleanupConfiguration();
    revenueRequests = configuration.revenueCatCleanupRequests(properties(environment));
    return configuration.revenueCatAccountCleanup(
        RestClient.builder(), revenueRequests, properties(environment));
  }

  /**
   * Supplies synthetic project/test evidence, never actual private environment inputs.
   *
   * @param environment explicit scenario scope
   * @return bounded settings for this peer only
   */
  private AccountCleanupProperties properties(Environment environment) {
    return new AccountCleanupProperties(
        environment,
        "isolated-test",
        URI.create(origin + "/v2"),
        "synthetic-project",
        "synthetic-secret",
        Set.of("known-original"),
        Duration.ofMillis(100),
        Duration.ofMillis(300));
  }
}
