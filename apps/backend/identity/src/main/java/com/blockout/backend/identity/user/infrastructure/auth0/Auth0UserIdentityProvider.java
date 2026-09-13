package com.blockout.backend.identity.user.infrastructure.auth0;

import com.blockout.backend.identity.config.Auth0ProfileProperties;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Validator;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.security.oauth2.client.endpoint.*;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;

/** Read-only Auth0 adapter with bounded HTTP, private credentials and safe expected failures. */
public final class Auth0UserIdentityProvider implements UserIdentityProvider, AutoCloseable {
  private static final String OPERATION = "operation";
  private static final String IDENTITY_PROVIDER_UNAVAILABLE = "IDENTITY_PROVIDER_UNAVAILABLE";

  private static final Logger LOG = LoggerFactory.getLogger(Auth0UserIdentityProvider.class);
  private final OAuth2ClientCredentialsGrantRequest grant;
  private final RestClientClientCredentialsTokenResponseClient tokens;
  private final Clock clock;
  private final MeterRegistry metrics;
  private final RestClient http;
  private final HttpClient client;
  private final Validator validator;
  private final URI origin;
  private String accessToken;
  private Instant refreshAt = Instant.MIN;
  private final Auth0Backoff backoff;

  public Auth0UserIdentityProvider(
      Auth0ProfileProperties properties, Clock clock, MeterRegistry metrics, Validator validator) {
    this.validator = validator;
    this.origin = URI.create(properties.baseUrl()).resolve("/");
    this.clock = clock;
    this.metrics = metrics;
    this.backoff = new Auth0Backoff(clock);
    client =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    var factory = new JdkClientHttpRequestFactory(client);
    factory.setReadTimeout(Duration.ofSeconds(5));
    http = RestClient.builder().requestFactory(factory).build();
    var registration =
        ClientRegistration.withRegistrationId("auth0-management")
            .clientId(properties.clientId())
            .clientSecret(properties.clientSecret())
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
            .tokenUri(origin.resolve("/oauth/token").toString())
            .scope("read:users")
            .build();
    grant = new OAuth2ClientCredentialsGrantRequest(registration);
    tokens = new RestClientClientCredentialsTokenResponseClient();
    tokens.addParametersConverter(
        _ -> {
          var parameters = new LinkedMultiValueMap<String, String>();
          parameters.set("audience", origin.resolve("/api/v2/").toString());
          return parameters;
        });
    tokens.setRestClient(
        http.mutate()
            .configureMessageConverters(
                converters ->
                    converters
                        .disableDefaults()
                        .addCustomConverter(new FormHttpMessageConverter())
                        .addCustomConverter(new OAuth2AccessTokenResponseHttpMessageConverter()))
            .defaultStatusHandler(
                status -> !status.is2xxSuccessful(),
                (_, response) -> rejectResponse("token", response))
            .build());
  }

  /** Releases the HTTP client when Spring destroys this provider bean. */
  @Override
  public void close() {
    client.close();
  }

  @Override
  public IdentityLookup find(ExternalIdentity identity) {
    long started = System.nanoTime();
    String token = null;
    try {
      token = token();
      Auth0Profile profile = readProfile(identity.subject(), token);
      if (!identity.subject().equals(profile.subject())) {
        record("mismatch", started);
        return new IdentityLookup.Mismatch();
      }
      var attributes =
          new ExternalProfile(
              profile.email(),
              profile.firstName(),
              profile.lastName(),
              profile.phoneNumber(),
              profile.pictureUrl());
      if (backoff.succeeded())
        LOG.atInfo()
            .addKeyValue("event.action", "identity.provider.recovered")
            .log("Identity provider recovered");
      record("success", started);
      return new IdentityLookup.Found(attributes);
    } catch (ProviderFailure failure) {
      if (token != null) {
        if (failure.status == 401) invalidateToken(token);
        if (failure.status == 401
            || failure.status == 403
            || failure.status == 429
            || failure.status >= 500) pause(failure);
        else logUnavailable(failure);
      }
      record(failure.code, started);
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
      pause(failure);
      throw failure;
    }
  }

  private void pause(ProviderFailure failure) {
    if (backoff.failed(failure.code, failure.retryAt)) logUnavailable(failure);
  }

  private void logUnavailable(ProviderFailure failure) {
    LOG.atWarn()
        .addKeyValue("event.action", "identity.lookup")
        .addKeyValue("event.outcome", "failure")
        .addKeyValue("error.code", failure.code)
        .log("Identity lookup unavailable");
  }

  private synchronized void invalidateToken(String rejected) {
    // A late 401 for the old token must not invalidate a newer concurrent renewal.
    if (rejected.equals(accessToken)) accessToken = null;
  }

  private String renewToken() {
    metrics.counter("blockout.identity.auth0.requests", OPERATION, "token").increment();
    try {
      var token = tokens.getTokenResponse(grant).getAccessToken();
      long lifetime = Duration.between(token.getIssuedAt(), token.getExpiresAt()).toSeconds();
      // Spring substitutes one second when expires_in is absent; do not turn that into a renewal
      // loop.
      if (lifetime <= 1) throw new ProviderFailure("IDENTITY_CONFIGURATION_ERROR");
      lifetime = Math.min(lifetime, 86400);
      accessToken = token.getTokenValue();
      metrics.counter("blockout.identity.auth0.tokens_issued").increment();
      refreshAt = clock.instant().plusSeconds(lifetime - Math.min(30, lifetime / 2));
      return accessToken;
    } catch (OAuth2AuthorizationException | RestClientException _) {
      throw new ProviderFailure(IDENTITY_PROVIDER_UNAVAILABLE);
    }
  }

  private Auth0Profile readProfile(String subject, String token) {
    var endpoint =
        UriComponentsBuilder.fromUri(origin)
            .pathSegment("api", "v2", "users", subject)
            .build()
            .encode()
            .toUri();
    metrics.counter("blockout.identity.auth0.requests", OPERATION, "profile").increment();
    try {
      var profile =
          http.get()
              .uri(endpoint)
              .headers(headers -> headers.setBearerAuth(token))
              .retrieve()
              .onStatus(
                  status -> !status.is2xxSuccessful(), (_, res) -> rejectResponse("profile", res))
              .body(Auth0Profile.class);
      if (profile == null || !validator.validate(profile).isEmpty())
        throw new ProviderFailure(IDENTITY_PROVIDER_UNAVAILABLE);
      return profile;
    } catch (RestClientException _) {
      throw new ProviderFailure(IDENTITY_PROVIDER_UNAVAILABLE, 503, Instant.MIN);
    }
  }

  /**
   * Translate status and retry headers without reading potentially private provider error bodies.
   */
  private void rejectResponse(String operation, ClientHttpResponse response) throws IOException {
    int status = response.getStatusCode().value();
    if (status == 429)
      metrics.counter("blockout.identity.auth0.rate_limited", OPERATION, operation).increment();
    throw new ProviderFailure(
        status == 401 || status == 403
            ? "IDENTITY_CONFIGURATION_ERROR"
            : IDENTITY_PROVIDER_UNAVAILABLE,
        status,
        retryAt(response.getHeaders()));
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
    } catch (NumberFormatException | DateTimeException | ArithmeticException _) {
      return Instant.MIN;
    }
  }

  private void record(String outcome, long started) {
    metrics
        .timer("blockout.identity.lookup", "outcome", outcome)
        .record(System.nanoTime() - started, java.util.concurrent.TimeUnit.NANOSECONDS);
  }

  private static final class ProviderFailure extends RuntimeException {
    @java.io.Serial private static final long serialVersionUID = 1L;

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
