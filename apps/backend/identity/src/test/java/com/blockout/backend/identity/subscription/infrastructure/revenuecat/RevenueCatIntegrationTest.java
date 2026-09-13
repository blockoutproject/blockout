package com.blockout.backend.identity.subscription.infrastructure.revenuecat;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.identity.config.RevenueCatProperties;
import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.identity.subscription.domain.SubscriptionFailure;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Controlled V2 boundary proof; no real customers or provider credentials are used. */
class RevenueCatIntegrationTest {
  HttpServer server;
  RevenueCatSubscriptions provider;
  final AtomicInteger requests = new AtomicInteger();
  final Map<String, String> pages = new HashMap<>();
  int status = 200;
  boolean delayed;
  final BillingBinding binding =
      new BillingBinding(UUID.randomUUID(), "project", "production", "auth0|retained");

  @BeforeEach
  void setup() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          requests.incrementAndGet();
          assertThat(exchange.getRequestMethod()).isEqualTo("GET");
          assertThat(exchange.getRequestHeaders().getFirst("Authorization"))
              .isEqualTo("Bearer fixture-key");
          if (exchange.getRequestURI().getPath().endsWith("/subscriptions"))
            assertThat(exchange.getRequestURI().getQuery()).contains("environment=production");
          if (delayed) {
            try {
              Thread.sleep(Duration.ofSeconds(6));
            } catch (InterruptedException _) {
              Thread.currentThread().interrupt();
              exchange.close();
              return;
            }
          }
          String path = exchange.getRequestURI().getRawPath();
          if (path.endsWith("/subscriptions")) assertThat(path).contains("auth0%7Cretained");
          assertThat(path).doesNotContain("//");
          byte[] body =
              pages
                  .getOrDefault(
                      exchange.getRequestURI().toString(),
                      pages.getOrDefault("default", "{\"items\":[],\"next_page\":null}"))
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          if (status == 429) exchange.getResponseHeaders().set("Retry-After", "60");
          exchange.sendResponseHeaders(status, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    server.start();
    provider =
        new RevenueCatSubscriptions(
            new RevenueCatProperties(
                "http://127.0.0.1:" + server.getAddress().getPort(), "fixture-key", "pro"),
            Clock.systemUTC(),
            new SimpleMeterRegistry());
  }

  @AfterEach
  void close() {
    provider.close();
    server.stop(0);
  }

  @ParameterizedTest
  @ValueSource(strings = {"active", "trialing", "in_grace_period"})
  void providerAccessRemainsAuthoritative(String state) throws InterruptedException {
    pages.put("default", subscription(state, "production", true, "[{\"id\":\"pro\"}]", null));
    assertThat(provider.read(binding))
        .isInstanceOfSatisfying(
            SubscriptionObservation.Verified.class, r -> assertThat(r.positive()).isTrue());
  }

  @Test
  void canceledPromotionalSubscriptionCanRetainAccess() throws InterruptedException {
    pages.put("default", subscription("active", "production", true, "[{\"id\":\"pro\"}]", null));
    var result = (SubscriptionObservation.Verified) provider.read(binding);
    assertThat(result.positive()).isTrue();
    assertThat(result.periodEnd()).isNull();
  }

  @Test
  void completeEmptyListConfirmsInactive() throws InterruptedException {
    assertThat(provider.read(binding)).isEqualTo(new SubscriptionObservation.Verified(false, null));
  }

  @Test
  void sandboxCannotGrantProductionAccess() throws InterruptedException {
    pages.put("default", subscription("active", "sandbox", true, "[{\"id\":\"pro\"}]", null));
    assertThat(provider.read(binding)).isInstanceOf(SubscriptionObservation.Failed.class);
  }

  @Test
  void wrongEntitlementConfirmsNoProAccess() throws InterruptedException {
    pages.put("default", subscription("active", "production", true, "[{\"id\":\"other\"}]", null));
    assertThat(provider.read(binding)).isEqualTo(new SubscriptionObservation.Verified(false, null));
  }

  @Test
  void followsEntitlementPagesBeforeDeciding() throws InterruptedException {
    pages.put(
        "default",
        subscription(
            "active",
            "production",
            true,
            "[]",
            "/v2/projects/project/subscriptions/sub/entitlements?starting_after=one"));
    pages.put(
        "/v2/projects/project/subscriptions/sub/entitlements?starting_after=one",
        "{\"items\":[{\"id\":\"pro\"}],\"next_page\":null}");
    assertThat(provider.read(binding)).isEqualTo(new SubscriptionObservation.Verified(true, null));
    assertThat(requests).hasValue(2);
  }

  @Test
  void malformedNextPageDoesNotCommitPartialPositiveEvidence() throws InterruptedException {
    pages.put(
        "default",
        subscription(
            "active", "production", true, "[{\"id\":\"pro\"}]", "https://foreign.invalid/steal"));
    assertThat(provider.read(binding)).isInstanceOf(SubscriptionObservation.Failed.class);
    assertThat(requests).hasValue(1);
  }

  @ParameterizedTest
  @ValueSource(ints = {401, 403, 404, 500})
  void providerFailuresNeverConfirmFree(int responseStatus) throws InterruptedException {
    status = responseStatus;
    assertThat(provider.read(binding)).isInstanceOf(SubscriptionObservation.Failed.class);
  }

  @Test
  void rateLimitPausesSubsequentCalls() throws InterruptedException {
    status = 429;
    var first = (SubscriptionObservation.Failed) provider.read(binding);
    provider.read(binding);
    assertThat(first.retryAfter()).isEqualTo(Duration.ofSeconds(60));
    assertThat(requests).hasValue(1);
  }

  @Test
  void missingListIsInvalidEvidence() throws InterruptedException {
    pages.put("default", "{}");
    assertThat(provider.read(binding))
        .isInstanceOfSatisfying(
            SubscriptionObservation.Failed.class,
            r -> assertThat(r.reason()).isEqualTo(SubscriptionFailure.INVALID_RESPONSE));
  }

  @Test
  void interruptedReadDoesNotCallProvider() {
    Thread.currentThread().interrupt();
    try {
      assertThatThrownBy(() -> provider.read(binding)).isInstanceOf(InterruptedException.class);
    } finally {
      Thread.interrupted();
    }
    assertThat(requests).hasValue(0);
  }

  @Test
  void incompleteEntitlementObjectsNeverConfirmFree() throws InterruptedException {
    pages.put("default", subscription("active", "production", true, "[{}]", null));
    assertThat(provider.read(binding)).isInstanceOf(SubscriptionObservation.Failed.class);
  }

  @Test
  void aPositiveFirstPageDoesNotHideBrokenSubscriptionPagination() throws InterruptedException {
    String body = subscription("active", "production", true, "[{\"id\":\"pro\"}]", null);
    pages.put(
        "default",
        body.substring(0, body.lastIndexOf("null}")) + "\"https://foreign.invalid/page\"}");
    assertThat(provider.read(binding)).isInstanceOf(SubscriptionObservation.Failed.class);
    assertThat(requests).hasValue(1);
  }

  @Test
  void followsSubscriptionPagesWithTheConfiguredEnvironment() throws InterruptedException {
    String next =
        "/v2/projects/project/customers/auth0%7Cretained/subscriptions?starting_after=one";
    pages.put("default", "{\"items\":[],\"next_page\":\"" + next + "\"}");
    pages.put(
        next + "&environment=production",
        subscription("active", "production", true, "[{\"id\":\"pro\"}]", null));
    assertThat(provider.read(binding)).isEqualTo(new SubscriptionObservation.Verified(true, null));
    assertThat(requests).hasValue(2);
  }

  @Test
  void readTimeoutIsRetryableWithoutAnImmediateRetry() throws InterruptedException {
    delayed = true;
    assertThat(provider.read(binding))
        .isInstanceOfSatisfying(
            SubscriptionObservation.Failed.class,
            failure -> {
              assertThat(failure.reason()).isEqualTo(SubscriptionFailure.UNAVAILABLE);
              assertThat(failure.permanent()).isFalse();
            });
    assertThat(requests).hasValue(1);
  }

  /**
   * Provides only the fields used by the adapter, including a nullable promotional product.
   *
   * @param status provider billing status, not the access decision
   * @param environment explicit store namespace
   * @param access authoritative provider access
   * @param entitlements embedded items
   * @param next optional entitlement continuation
   * @return synthetic subscription page
   */
  private static String subscription(
      String status, String environment, boolean access, String entitlements, String next) {
    return "{\"items\":[{\"id\":\"sub\",\"status\":\""
        + status
        + "\",\"environment\":\""
        + environment
        + "\",\"gives_access\":"
        + access
        + ",\"auto_renewal_status\":\"will_not_renew\",\"product_id\":null,\"ends_at\":null,\"entitlements\":{\"items\":"
        + entitlements
        + ",\"next_page\":"
        + (next == null ? "null" : "\"" + next + "\"")
        + "}}],\"next_page\":null}";
  }
}
