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

class Auth0IdentityIntegrationTest {
  HttpServer server;
  ExecutorService executor;
  AtomicInteger tokens = new AtomicInteger();
  AtomicInteger profiles = new AtomicInteger();
  volatile int tokenStatus = 200, profileStatus = 200;
  volatile String profileBody =
      "{\"user_id\":\"google-oauth2|person\",\"email\":\"person@example.test\"}";
  volatile String tokenBody =
      "{\"access_token\":\"synthetic-secret\",\"token_type\":\"Bearer\",\"expires_in\":3600}";
  AtomicReference<String> tokenRequest = new AtomicReference<>(),
      path = new AtomicReference<>(),
      authorization = new AtomicReference<>();
  MutableClock clock = new MutableClock();
  SimpleMeterRegistry metrics = new SimpleMeterRegistry();

  @BeforeEach
  void start() throws Exception {
    executor = Executors.newCachedThreadPool();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.setExecutor(executor);
    server.createContext(
        "/oauth/token",
        ex -> {
          tokens.incrementAndGet();
          tokenRequest.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          respond(ex, tokenStatus, tokenBody);
        });
    server.createContext(
        "/api/v2/users/",
        ex -> {
          profiles.incrementAndGet();
          path.set(ex.getRequestURI().getRawPath());
          authorization.set(ex.getRequestHeaders().getFirst("Authorization"));
          respond(ex, profileStatus, profileBody);
        });
    server.start();
  }

  @AfterEach
  void stop() {
    server.stop(0);
    executor.shutdownNow();
    metrics.close();
  }

  Auth0UserIdentityProvider provider() {
    return new Auth0UserIdentityProvider(
        new Auth0ProfileProperties(
            URI.create("http://127.0.0.1:" + server.getAddress().getPort()),
            "client",
            "secret",
            true),
        clock,
        metrics);
  }

  ExternalIdentity actor() {
    return new ExternalIdentity("https://tenant.example/", "google-oauth2|person");
  }

  void respond(HttpExchange ex, int code, String body) throws java.io.IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    ex.getResponseHeaders().add("Content-Type", "application/json");
    ex.sendResponseHeaders(code, bytes.length);
    ex.getResponseBody().write(bytes);
    ex.close();
  }

  @Test
  void readsOnlyTheExactIdentityWithCachedReadOnlyCredentials() {
    var provider = provider();
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(1);
    assertThat(profiles).hasValue(2);
    assertThat(path.get()).endsWith("google-oauth2%7Cperson");
    assertThat(tokenRequest.get())
        .contains("read:users", "client_credentials")
        .doesNotContain("update:users", "delete:users");
    assertThat(authorization.get()).isEqualTo("Bearer synthetic-secret");
  }

  @Test
  void refreshesExpiredCredentials() {
    var provider = provider();
    provider.find(actor());
    clock.now = clock.now.plusSeconds(3600);
    provider.find(actor());
    assertThat(tokens).hasValue(2);
  }

  @Test
  void coalescesConcurrentCredentialRequests() throws Exception {
    var provider = provider();
    try (var pool = Executors.newFixedThreadPool(6)) {
      var futures = new java.util.ArrayList<Future<IdentityLookup>>();
      for (int i = 0; i < 6; i++) futures.add(pool.submit(() -> provider.find(actor())));
      for (var f : futures)
        assertThat(f.get(10, TimeUnit.SECONDS)).isInstanceOf(IdentityLookup.Found.class);
    }
    assertThat(tokens).hasValue(1);
  }

  @Test
  void acceptsAbsentOptionalAttributes() {
    profileBody = "{\"user_id\":\"google-oauth2|person\"}";
    var result = (IdentityLookup.Found) provider().find(actor());
    assertThat(result.profile().email()).isNull();
  }

  @Test
  void rejectsAProviderSubjectMismatch() {
    profileBody = "{\"user_id\":\"apple|other\"}";
    assertThat(provider().find(actor())).isInstanceOf(IdentityLookup.Mismatch.class);
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(ints = {401, 403, 404, 429, 500, 503})
  void returnsSafeDependencyFailures(int status) {
    profileStatus = status;
    profileBody = "{\"message\":\"private@example.test synthetic-secret\"}";
    var result = provider().find(actor());
    assertThat(result).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(result.toString()).doesNotContain("private@", "synthetic-secret");
  }

  @Test
  void rejectsMalformedProviderAttributes() {
    profileBody = "{\"user_id\":\"google-oauth2|person\",\"email\":[]}";
    assertThat(provider().find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
  }

  @Test
  void rejectsMalformedTokenResponse() {
    tokenBody = "{}";
    assertThat(provider().find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(profiles).hasValue(0);
  }

  @Test
  void capsTheCacheWithoutRejectingLongLivedProviderTokens() {
    tokenBody =
        "{\"access_token\":\"synthetic-secret\",\"token_type\":\"Bearer\",\"expires_in\":172800}";
    var provider = provider();
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    clock.now = clock.now.plusSeconds(86400);
    assertThat(provider.find(actor())).isInstanceOf(IdentityLookup.Found.class);
    assertThat(tokens).hasValue(2);
  }

  @Test
  void rejectsOversizedProviderResponses() {
    profileBody = " ".repeat(65537);
    assertThat(provider().find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
  }

  @Test
  void rejectsMalformedJson() {
    profileBody = "{not-json";
    assertThat(provider().find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
  }

  @Test
  void tokenFailureDoesNotReadAProfile() {
    tokenStatus = 503;
    assertThat(provider().find(actor())).isInstanceOf(IdentityLookup.Unavailable.class);
    assertThat(profiles).hasValue(0);
  }

  @Test
  void rejectsInsecureNonLoopbackConfiguration() {
    assertThatThrownBy(
            () ->
                new Auth0ProfileProperties(
                    URI.create("http://tenant.example"), "client", "secret", true))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsEmbeddedCredentials() {
    assertThatThrownBy(
            () ->
                new Auth0ProfileProperties(
                    URI.create("https://secret@tenant.example"), "client", "secret", false))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void configurationNeverPrintsTheSecret() {
    assertThat(
            new Auth0ProfileProperties(
                    URI.create("https://tenant.example"), "client", "secret", false)
                .toString())
        .doesNotContain("secret", "client");
  }

  static final class MutableClock extends Clock {
    volatile Instant now = Instant.parse("2026-09-12T12:00:00Z");

    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    public Clock withZone(ZoneId zone) {
      return this;
    }

    public Instant instant() {
      return now;
    }
  }
}
