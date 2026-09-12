package com.blockout.backend.identity.user.infrastructure.auth0;

import com.blockout.backend.identity.config.Auth0ProfileProperties;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import io.micrometer.core.instrument.MeterRegistry;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.*;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Read-only Auth0 adapter with bounded HTTP, private credentials and safe expected failures. */
public final class Auth0UserIdentityProvider implements UserIdentityProvider {
  private static final Logger LOG = LoggerFactory.getLogger(Auth0UserIdentityProvider.class);
  private static final int MAX_RESPONSE_BYTES = 65536;
  private final Auth0ProfileProperties properties;
  private final Clock clock;
  private final MeterRegistry metrics;
  private final RestClient http;
  private final JsonMapper json = new JsonMapper();
  private String accessToken;
  private Instant refreshAt = Instant.MIN;
  private final Auth0Backoff backoff;

  public Auth0UserIdentityProvider(
      Auth0ProfileProperties properties, Clock clock, MeterRegistry metrics) {
    this.properties = properties;
    this.clock = clock;
    this.metrics = metrics;
    this.backoff = new Auth0Backoff(clock);
    var client =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    var factory = new JdkClientHttpRequestFactory(client);
    factory.setReadTimeout(Duration.ofSeconds(5));
    http = RestClient.builder().requestFactory(factory).build();
  }

  @Override
  public IdentityLookup find(ExternalIdentity identity) {
    long started = System.nanoTime();
    String token = null;
    try {
      token = token();
      URI endpoint =
          UriComponentsBuilder.fromUri(properties.baseUrl())
              .pathSegment("api", "v2", "users", identity.subject())
              .build()
              .encode()
              .toUri();
      JsonNode profile =
          read("profile", http.get().uri(endpoint).header("Authorization", "Bearer " + token));
      String subject = text(profile, "user_id", 255);
      if (!identity.subject().equals(subject)) {
        record("mismatch", started);
        return new IdentityLookup.Mismatch();
      }
      var attributes =
          new ExternalProfile(
              text(profile, "email", 320),
              text(profile, "given_name", 255),
              text(profile, "family_name", 255),
              text(profile, "phone_number", 64),
              text(profile, "picture", 2048));
      backoff.succeeded();
      record("success", started);
      return new IdentityLookup.Found(attributes);
    } catch (ProviderFailure failure) {
      if (token != null) {
        if (failure.status == 401) invalidateToken(token);
        if (failure.status == 401
            || failure.status == 403
            || failure.status == 429
            || failure.status >= 500) backoff.failed(failure.code, failure.retryAt);
      }
      record(failure.code, started);
      LOG.atWarn()
          .addKeyValue("event.action", "identity.lookup")
          .addKeyValue("event.outcome", "failure")
          .addKeyValue("error.code", failure.code)
          .log("Identity lookup unavailable");
      return new IdentityLookup.Unavailable(failure.code);
    }
  }

  /**
   * Serializes credential renewal; the shared pause also applies when the cached token is valid.
   */
  private synchronized String token() {
    var blocked = backoff.blockedReason();
    if (blocked.isPresent()) {
      metrics.counter("blockout.identity.auth0.suppressed").increment();
      throw new ProviderFailure(blocked.get());
    }
    if (accessToken != null && clock.instant().isBefore(refreshAt)) return accessToken;
    try {
      return renewToken();
    } catch (ProviderFailure failure) {
      backoff.failed(failure.code, failure.retryAt);
      throw failure;
    }
  }

  private synchronized void invalidateToken(String rejected) {
    // A late 401 for the old token must not invalidate a newer concurrent renewal.
    if (rejected != null && rejected.equals(accessToken)) accessToken = null;
  }

  private String renewToken() {
    var endpoint = properties.baseUrl().resolve("/oauth/token");
    var body =
        Map.of(
            "grant_type",
            "client_credentials",
            "client_id",
            properties.clientId(),
            "client_secret",
            properties.clientSecret(),
            "audience",
            properties.baseUrl().resolve("/api/v2/").toString(),
            "scope",
            "read:users");
    JsonNode response =
        read("token", http.post().uri(endpoint).contentType(MediaType.APPLICATION_JSON).body(body));
    String candidate = text(response, "access_token", 16384);
    JsonNode seconds = response.path("expires_in");
    if (candidate == null
        || candidate.isBlank()
        || !seconds.isIntegralNumber()
        || seconds.asLong() <= 0
        || !"Bearer".equalsIgnoreCase(text(response, "token_type", 20)))
      throw new ProviderFailure("IDENTITY_CONFIGURATION_ERROR");
    long lifetime = Math.min(seconds.asLong(), 86400);
    accessToken = candidate;
    metrics.counter("blockout.identity.auth0.tokens_issued").increment();
    refreshAt = clock.instant().plusSeconds(lifetime - Math.min(30, lifetime / 2));
    return accessToken;
  }

  private JsonNode read(String operation, RestClient.RequestHeadersSpec<?> request) {
    metrics.counter("blockout.identity.auth0.requests", "operation", operation).increment();
    try {
      return request.exchange(
          (req, res) -> {
            int status = res.getStatusCode().value();
            if (status == 429)
              metrics
                  .counter("blockout.identity.auth0.rate_limited", "operation", operation)
                  .increment();
            if (status < 200 || status >= 300)
              throw new ProviderFailure(
                  status == 401 || status == 403
                      ? "IDENTITY_CONFIGURATION_ERROR"
                      : "IDENTITY_PROVIDER_UNAVAILABLE",
                  status,
                  retryAt(res.getHeaders()));
            byte[] bytes = res.getBody().readNBytes(MAX_RESPONSE_BYTES + 1);
            if (bytes.length > MAX_RESPONSE_BYTES)
              throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
            JsonNode node = json.readTree(bytes);
            if (node == null || !node.isObject())
              throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
            return node;
          });
    } catch (RestClientException failure) {
      throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE", 503, Instant.MIN);
    } catch (tools.jackson.core.JacksonException failure) {
      throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
    }
  }

  private Instant retryAt(HttpHeaders headers) {
    var after = retryTime(headers.getFirst("Retry-After"), clock.instant());
    var reset = retryTime(headers.getFirst("X-RateLimit-Reset"), Instant.EPOCH);
    return after.isAfter(reset) ? after : reset;
  }

  /** Auth0 sends Retry-After as seconds and X-RateLimit-Reset as Unix seconds. */
  private Instant retryTime(String value, Instant base) {
    if (value == null) return Instant.MIN;
    try {
      long seconds = Long.parseLong(value.trim());
      return seconds >= 0 ? base.plusSeconds(seconds) : Instant.MIN;
    } catch (NumberFormatException | DateTimeException | ArithmeticException invalid) {
      return Instant.MIN;
    }
  }

  private String text(JsonNode node, String field, int limit) {
    JsonNode value = node.get(field);
    if (value == null || value.isNull()) return null;
    if (!value.isString() || value.asString().length() > limit)
      throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
    return value.asString();
  }

  private void record(String outcome, long started) {
    metrics
        .timer("blockout.identity.lookup", "outcome", outcome)
        .record(System.nanoTime() - started, java.util.concurrent.TimeUnit.NANOSECONDS);
  }

  private static final class ProviderFailure extends RuntimeException {
    private final String code;
    private final int status;
    private final Instant retryAt;

    ProviderFailure(String code) {
      this(code, 0, Instant.MIN);
    }

    ProviderFailure(String code, int status, Instant retryAt) {
      super(code);
      this.code = code;
      this.status = status;
      this.retryAt = retryAt;
    }
  }
}
