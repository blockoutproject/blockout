package com.blockout.backend.identity.user.infrastructure.auth0;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.identity.config.Auth0ProfileProperties;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import com.sun.net.httpserver.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;

/**
 * Exercises the real Auth0 adapter against controlled HTTP responses and a manually advanced clock.
 */
class Auth0IdentityIntegrationTest {
  static final jakarta.validation.ValidatorFactory VALIDATION =
      jakarta.validation.Validation.buildDefaultValidatorFactory();

  @AfterAll
  static void closeValidation() {
    VALIDATION.close();
  }

  HttpServer server;
  Auth0UserIdentityProvider provider;
  ExecutorService executor;
  AtomicInteger tokens = new AtomicInteger();
  AtomicInteger profiles = new AtomicInteger();
  volatile int tokenStatus = 200, profileStatus = 200;
  volatile java.util.Map<String, String> tokenHeaders = java.util.Map.of(),
      profileHeaders = java.util.Map.of();
  volatile String profileBody =
      "{\"user_id\":\"google-oauth2|person\",\"email\":\"person@example.test\"}";
  volatile String tokenBody =
      "{\"access_token\":\"synthetic-secret\",\"token_type\":\"Bearer\",\"expires_in\":3600}";
  AtomicReference<String> tokenRequest = new AtomicReference<>(),
      path = new AtomicReference<>(),
      authorization = new AtomicReference<>();
  MutableClock clock = new MutableClock();
  SimpleMeterRegistry metrics = new SimpleMeterRegistry();

  /** Starts an isolated HTTP provider with synthetic credentials, counters and a test clock. */
  @BeforeEach
  void start() throws java.io.IOException {
    executor = Executors.newCachedThreadPool();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.setExecutor(executor);
    server.createContext(
        "/oauth/token",
        ex -> {
          tokens.incrementAndGet();
          try (var requestBody = ex.getRequestBody()) {
            tokenRequest.set(new String(requestBody.readAllBytes(), StandardCharsets.UTF_8));
          }
          tokenHeaders.forEach((key, value) -> ex.getResponseHeaders().add(key, value));
          respond(ex, tokenStatus, tokenBody);
        });
    server.createContext(
        "/api/v2/users/",
        ex -> {
          profiles.incrementAndGet();
          path.set(ex.getRequestURI().getRawPath());
          authorization.set(ex.getRequestHeaders().getFirst("Authorization"));
          profileHeaders.forEach((key, value) -> ex.getResponseHeaders().add(key, value));
          respond(ex, profileStatus, profileBody);
        });
    server.start();
    provider =
        new Auth0UserIdentityProvider(
            new Auth0ProfileProperties(
                "http://127.0.0.1:" + server.getAddress().getPort(), "client", "secret"),
            clock,
            metrics,
            VALIDATION.getValidator());
  }

  @AfterEach
  void stop() {
    provider.close();
    server.stop(0);
    executor.shutdownNow();
    metrics.close();
  }

  /**
   * Selects the exact synthetic subject served by the default fixture response.
   *
   * @return the canonical fixture identity
   */
  ExternalIdentity actor() {
    return new ExternalIdentity("https://tenant.example/", "google-oauth2|person");
  }

  /**
   * Writes a controlled provider response and closes the exchange and response stream.
   *
   * @param ex test-server exchange
   * @param code HTTP status under test
   * @param body synthetic JSON response
   */
  void respond(HttpExchange ex, int code, String body) throws java.io.IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    ex.getResponseHeaders().add("Content-Type", "application/json");
    ex.sendResponseHeaders(code, bytes.length);
    try (ex;
        var responseBody = ex.getResponseBody()) {
      responseBody.write(bytes);
    }
  }

  @Test
  void readsOnlyTheExactIdentityWithCachedReadOnlyCredentials() {
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(1);
    assertThat(profiles).hasValue(2);
    assertThat(path.get()).endsWith("google-oauth2%7Cperson");
    assertThat(URLDecoder.decode(tokenRequest.get(), StandardCharsets.UTF_8))
        .contains("read:users", "client_credentials")
        .doesNotContain("update:users", "delete:users");
    assertThat(authorization.get()).isEqualTo("Bearer synthetic-secret");
  }

  @Test
  void refreshesExpiredCredentials() {
    provider.find(actor());
    clock.now = clock.now.plusSeconds(3600);
    provider.find(actor());
    assertThat(tokens).hasValue(2);
  }

  @Test
  void coalescesConcurrentCredentialRequests()
      throws InterruptedException, ExecutionException, TimeoutException {
    try (var pool = Executors.newFixedThreadPool(6)) {
      var futures = new java.util.ArrayList<Future<IdentityLookup>>();
      for (int i = 0; i < 6; i++) futures.add(pool.submit(() -> provider.find(actor())));
      for (var f : futures)
        assertThat(f.get(10, TimeUnit.SECONDS)).isInstanceOf(IdentityLookup.Found.class);
    }
    assertThat(tokens).hasValue(1);
  }

  @Test
  void coalescesFailedCredentialRequestsUntilTheRetryDelay()
      throws InterruptedException, ExecutionException, TimeoutException {
    tokenStatus = 503;

    try (var pool = Executors.newFixedThreadPool(6)) {
      var futures = new java.util.ArrayList<Future<IdentityLookup>>();
      for (int i = 0; i < 6; i++) futures.add(pool.submit(() -> provider.find(actor())));
      for (var future : futures)
        assertThat(future.get(10, TimeUnit.SECONDS)).isInstanceOf(IdentityLookup.Unavailable.class);
    }
    assertThat(tokens).hasValue(1);
    assertThat(profiles).hasValue(0);

    tokenStatus = 200;
    clock.now = clock.now.plusSeconds(5);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(2);
  }

  @Test
  void logsOneProviderOutageUntilRecovery()
      throws InterruptedException, ExecutionException, TimeoutException {
    var logger =
        (ch.qos.logback.classic.Logger)
            org.slf4j.LoggerFactory.getLogger(Auth0UserIdentityProvider.class);
    var logs =
        new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
    logs.start();
    logger.addAppender(logs);
    tokenStatus = 503;
    try {
      try (var pool = Executors.newFixedThreadPool(6)) {
        var calls = new java.util.ArrayList<Future<IdentityLookup>>();
        for (int i = 0; i < 6; i++) calls.add(pool.submit(() -> provider.find(actor())));
        for (var call : calls)
          assertThat(call.get(10, TimeUnit.SECONDS)).isInstanceOf(IdentityLookup.Unavailable.class);
      }
      assertThat(logs.list).hasSize(1);
      clock.now = clock.now.plusSeconds(5);
      provider.find(actor());
      assertThat(logs.list).hasSize(1);

      clock.now = clock.now.plusSeconds(10);
      tokenStatus = 200;
      assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
      assertThat(logs.list)
          .extracting(ch.qos.logback.classic.spi.ILoggingEvent::getLevel)
          .containsExactly(ch.qos.logback.classic.Level.WARN, ch.qos.logback.classic.Level.INFO);
      assertThat(logs.list.toString()).doesNotContain("synthetic-secret", "person@example.test");
    } finally {
      logger.detachAppender(logs);
      logs.stop();
    }
  }

  @Test
  void renewsARejectedCachedTokenAfterThePause() {
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    profileStatus = 401;

    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    profileStatus = 200;
    clock.now = clock.now.plusSeconds(5);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);

    assertThat(tokens).hasValue(2);
  }

  @Test
  void repeatedTokenRejectionsIncreaseThePauseUpToFiveMinutes() {
    profileStatus = 401;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);

    int requests = 1;
    for (int delay : new int[] {5, 10, 20, 40, 80, 160, 300, 300}) {
      clock.now = clock.now.plusSeconds(delay - 1);
      for (int i = 0; i < 6; i++)
        assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
      assertThat(tokens).hasValue(requests);
      assertThat(profiles).hasValue(requests);

      clock.now = clock.now.plusSeconds(1);
      assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
      assertThat(tokens).hasValue(++requests);
    }
    assertThat(
            metrics
                .get("blockout.identity.auth0.requests")
                .tag("operation", "token")
                .counter()
                .count())
        .isEqualTo(requests);
    assertThat(metrics.get("blockout.identity.auth0.suppressed").counter().count()).isEqualTo(48);
  }

  @Test
  void successfulProfileReadRestoresTheInitialPause() {
    profileStatus = 503;
    provider.find(actor());
    clock.now = clock.now.plusSeconds(5);
    provider.find(actor());
    clock.now = clock.now.plusSeconds(10);
    profileStatus = 200;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);

    profileStatus = 503;
    provider.find(actor());
    clock.now = clock.now.plusSeconds(5);
    profileStatus = 200;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(1);
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.CsvSource({
    "token,Retry-After", "profile,Retry-After",
    "token,X-RateLimit-Reset", "profile,X-RateLimit-Reset"
  })
  void honorsProviderRateLimitDelays(String operation, String header) {
    String value =
        header.equals("Retry-After")
            ? "600"
            : Long.toString(clock.now.plusSeconds(600).getEpochSecond());
    if (operation.equals("token")) {
      tokenStatus = 429;
      tokenHeaders = java.util.Map.of(header, value);
    } else {
      profileStatus = 429;
      profileHeaders = java.util.Map.of(header, value);
    }
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    int calls = profiles.get();
    clock.now = clock.now.plusSeconds(599);

    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(tokens).hasValue(1);
    assertThat(profiles).hasValue(calls);
    assertThat(
            metrics
                .get("blockout.identity.auth0.rate_limited")
                .tag("operation", operation)
                .counter()
                .count())
        .isEqualTo(1);

    clock.now = clock.now.plusSeconds(1);
    tokenStatus = profileStatus = 200;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
  }

  @Test
  void missingProviderUserDoesNotPauseOtherLookups() {
    profileStatus = 404;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);

    profileStatus = 200;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(1);
  }

  @Test
  void acceptsAbsentOptionalAttributes() {
    profileBody = "{\"user_id\":\"google-oauth2|person\"}";
    var result = (IdentityLookup.Found) provider.find(actor());
    assertThat(result.profile().email()).isNull();
  }

  @Test
  void rejectsAProviderSubjectMismatch() {
    profileBody = "{\"user_id\":\"apple|other\"}";
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Mismatch.class);
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(ints = {401, 403, 404, 429, 500, 503})
  void returnsSafeDependencyFailures(int status) {
    profileStatus = status;
    profileBody = "{\"message\":\"private@example.test synthetic-secret\"}";
    var result = provider.find(actor());
    assertThat(result).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(result.toString()).doesNotContain("private@", "synthetic-secret");
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
  void boundsStalledProviderResponses(boolean sendHeaders)
      throws InterruptedException, ExecutionException, TimeoutException {
    var received = new CountDownLatch(1);
    var release = new CountDownLatch(1);
    server.removeContext("/api/v2/users/");
    server.createContext(
        "/api/v2/users/",
        exchange -> {
          try (exchange;
              var responseBody = exchange.getResponseBody()) {
            if (sendHeaders) {
              exchange.sendResponseHeaders(200, 0);
              responseBody.write('{');
              responseBody.flush();
            }
            received.countDown();
            release.await();
          } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
          }
        });

    try (var pool = Executors.newSingleThreadExecutor()) {
      var result = pool.submit(() -> provider.find(actor()));
      try {
        assertThat(received.await(3, TimeUnit.SECONDS)).isTrue();
        assertThat(result.get(8, TimeUnit.SECONDS))
            .isEqualTo(
                new IdentityLookup.Unavailable(
                    IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE));
      } finally {
        release.countDown();
      }
    }
  }

  @Test
  void rejectsMalformedProviderAttributes() {
    profileBody = "{\"user_id\":\"google-oauth2|person\",\"email\":[]}";
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
  }

  @Test
  void rejectsMalformedTokenResponse() {
    tokenBody = "{}";
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(profiles).hasValue(0);
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(
      strings = {"", ",\"expires_in\":0", ",\"expires_in\":-1"})
  void pausesRenewalWhenTokenHasNoUsableLifetime(String expiry) {
    tokenBody = "{\"access_token\":\"synthetic-secret\",\"token_type\":\"Bearer\"" + expiry + "}";

    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);

    assertThat(tokens).hasValue(1);
    assertThat(profiles).hasValue(0);
  }

  @Test
  void reusesTheTokenForItsProviderLifetime() {
    tokenBody =
        "{\"access_token\":\"synthetic-secret\",\"token_type\":\"Bearer\",\"expires_in\":172800}";
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    clock.now = clock.now.plusSeconds(86400);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(1);
    clock.now = clock.now.plusSeconds(86400);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(2);
  }

  @Test
  void rejectsAttributesThatExceedStorageLimits() {
    profileBody = "{\"user_id\":\"google-oauth2|person\",\"email\":\"" + "a".repeat(321) + "\"}";
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
  }

  @Test
  void rejectsMalformedJson() {
    profileBody = "{not-json";
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
  }

  @Test
  void tokenFailureDoesNotReadAProfile() {
    tokenStatus = 503;
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(profiles).hasValue(0);
  }

  @Test
  void configurationNeverPrintsTheSecret() {
    assertThat(new Auth0ProfileProperties("https://tenant.example", "client", "secret").toString())
        .doesNotContain("secret", "client");
  }

  /** Provides manually advanced UTC time for cache and pause tests; zone conversion is unused. */
  static final class MutableClock extends Clock {
    volatile Instant now = Instant.parse("2026-09-12T12:00:00Z");

    /** {@inheritDoc} */
    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    /** {@inheritDoc} */
    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    /** {@inheritDoc} */
    @Override
    public Instant instant() {
      return now;
    }
  }
}
