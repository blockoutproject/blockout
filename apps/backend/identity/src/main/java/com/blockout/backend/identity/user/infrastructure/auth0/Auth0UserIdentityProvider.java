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

  public Auth0UserIdentityProvider(
      Auth0ProfileProperties properties, Clock clock, MeterRegistry metrics) {
    this.properties = properties;
    this.clock = clock;
    this.metrics = metrics;
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
    try {
      String token = token();
      URI endpoint =
          UriComponentsBuilder.fromUri(properties.baseUrl())
              .pathSegment("api", "v2", "users", identity.subject())
              .build()
              .encode()
              .toUri();
      JsonNode profile = read(http.get().uri(endpoint).headers(h -> h.setBearerAuth(token)));
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
      record("success", started);
      return new IdentityLookup.Found(attributes);
    } catch (ProviderFailure failure) {
      record(failure.code, started);
      LOG.atWarn()
          .addKeyValue("event.action", "identity.lookup")
          .addKeyValue("event.outcome", "failure")
          .addKeyValue("error.code", failure.code)
          .log("Identity lookup unavailable");
      return new IdentityLookup.Unavailable(failure.code);
    }
  }

  /** Synchronized renewal prevents concurrent first logins from issuing a token-request burst. */
  private synchronized String token() {
    if (accessToken != null && clock.instant().isBefore(refreshAt)) return accessToken;
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
        read(http.post().uri(endpoint).contentType(MediaType.APPLICATION_JSON).body(body));
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
    refreshAt = clock.instant().plusSeconds(lifetime - Math.min(30, lifetime / 2));
    return accessToken;
  }

  private JsonNode read(RestClient.RequestHeadersSpec<?> request) {
    try {
      return request.exchange(
          (req, res) -> {
            int status = res.getStatusCode().value();
            if (status < 200 || status >= 300)
              throw new ProviderFailure(
                  status == 401 || status == 403
                      ? "IDENTITY_CONFIGURATION_ERROR"
                      : "IDENTITY_PROVIDER_UNAVAILABLE");
            byte[] bytes = res.getBody().readNBytes(MAX_RESPONSE_BYTES + 1);
            if (bytes.length > MAX_RESPONSE_BYTES)
              throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
            JsonNode node = json.readTree(bytes);
            if (node == null || !node.isObject())
              throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
            return node;
          });
    } catch (RestClientException | tools.jackson.core.JacksonException failure) {
      throw new ProviderFailure("IDENTITY_PROVIDER_UNAVAILABLE");
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

    ProviderFailure(String code) {
      super(code);
      this.code = code;
    }
  }
}
