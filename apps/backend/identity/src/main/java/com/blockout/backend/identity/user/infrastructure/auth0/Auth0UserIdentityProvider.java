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
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.security.oauth2.client.endpoint.*;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;

/** Read-only Auth0 adapter with bounded HTTP, private credentials and safe expected failures. */
@Slf4j
public final class Auth0UserIdentityProvider implements UserIdentityProvider, AutoCloseable {
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

  /**
   * Creates bounded read-only Auth0 transport and the standard OAuth token client. The adapter owns
   * its JDK client and must be closed when the application stops.
   *
   * @param properties validated Auth0 origin and private Management API credentials
   * @param clock token-cache and provider-pause deadline source
   * @param metrics registry for bounded operational counters and durations
   * @param validator validator for decoded provider attributes
   */
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
    JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
    factory.setReadTimeout(Duration.ofSeconds(5));
    http = RestClient.builder().requestFactory(factory).build();
    ClientRegistration registration =
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
          MultiValueMap<String, String> parameters = new LinkedMultiValueMap<>();
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
                (_, response) -> rejectResponse(Operation.TOKEN, response))
            .build());
  }

  /** Releases the HTTP client when Spring destroys this provider bean. */
  @Override
  public void close() {
    client.close();
  }

  /** {@inheritDoc} */
  @Override
  public IdentityLookup find(ExternalIdentity identity) {
    long started = System.nanoTime();
    String token = null;
    try {
      token = token();
      Auth0Profile profile = readProfile(identity.subject(), token);
      if (!identity.subject().equals(profile.subject())) {
        record(LookupOutcome.MISMATCH, started);
        return new IdentityLookup.Mismatch();
      }
      ExternalProfile attributes =
          new ExternalProfile(
              profile.email(),
              profile.firstName(),
              profile.lastName(),
              profile.phoneNumber(),
              profile.pictureUrl());
      if (backoff.succeeded())
        log.atInfo()
            .addKeyValue("event.action", "identity.provider.recovered")
            .log("Identity provider recovered");
      record(LookupOutcome.SUCCESS, started);
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
      record(LookupOutcome.valueOf(failure.reason.name()), started);
      return new IdentityLookup.Unavailable(failure.reason);
    }
  }

  /**
   * Serializes credential renewal; the shared pause also applies when the cached token is valid.
   *
   * @return the reusable or newly issued credential
   * @throws ProviderFailure calls are paused or renewal fails
   */
  private synchronized String token() {
    Optional<IdentityFailureReason> blocked = backoff.blockedReason();
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

  /**
   * Updates the shared outage pause and logs only its first transition.
   *
   * @param failure safe reason, response status and provider retry deadline
   */
  private void pause(ProviderFailure failure) {
    if (backoff.failed(failure.reason, failure.retryAt)) logUnavailable(failure);
  }

  /**
   * Logs the stable failure reason without credentials, subject or provider body.
   *
   * @param failure adapter failure whose safe reason is operationally useful
   */
  private void logUnavailable(ProviderFailure failure) {
    log.atWarn()
        .addKeyValue("event.action", "identity.lookup")
        .addKeyValue("event.outcome", "failure")
        .addKeyValue("error.code", failure.reason.name())
        .log("Identity lookup unavailable");
  }

  /**
   * Discards a rejected cached token only if no newer token has replaced it.
   *
   * @param rejected token used by the request receiving a 401
   */
  private synchronized void invalidateToken(String rejected) {
    // A late 401 for the old token must not invalidate a newer concurrent renewal.
    if (rejected.equals(accessToken)) accessToken = null;
  }

  /**
   * Requests and caches one token for its provider lifetime, with a short early refresh margin.
   * Unusable token lifetimes fail rather than causing repeated immediate renewal.
   *
   * @return the cached Management API access token
   * @throws ProviderFailure OAuth exchange fails or supplies no usable cache lifetime
   */
  private String renewToken() {
    metrics
        .counter("blockout.identity.auth0.requests", "operation", Operation.TOKEN.value())
        .increment();
    try {
      OAuth2AccessToken token = tokens.getTokenResponse(grant).getAccessToken();
      long lifetime = Duration.between(token.getIssuedAt(), token.getExpiresAt()).toSeconds();
      // Spring substitutes one second when expires_in is absent; do not turn that into a renewal
      // loop.
      if (lifetime <= 1)
        throw new ProviderFailure(IdentityFailureReason.IDENTITY_CONFIGURATION_ERROR);
      accessToken = token.getTokenValue();
      metrics.counter("blockout.identity.auth0.tokens_issued").increment();
      refreshAt = clock.instant().plusSeconds(lifetime - Math.min(30, lifetime / 2));
      return accessToken;
    } catch (OAuth2AuthorizationException | RestClientException _) {
      throw new ProviderFailure(IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE);
    }
  }

  /**
   * Fetches one exact subject and validates nullable attribute bounds before any SQL write.
   *
   * @param subject canonical subject encoded as a single URL path segment
   * @param token cached Management API bearer credential
   * @return a complete validated provider profile
   * @throws ProviderFailure HTTP, decoding or attribute validation prevents a complete profile
   */
  private Auth0Profile readProfile(String subject, String token) {
    URI endpoint =
        UriComponentsBuilder.fromUri(origin)
            .pathSegment("api", "v2", "users", subject)
            .build()
            .encode()
            .toUri();
    metrics
        .counter("blockout.identity.auth0.requests", "operation", Operation.PROFILE.value())
        .increment();
    try {
      Auth0Profile profile =
          http.get()
              .uri(endpoint)
              .headers(headers -> headers.setBearerAuth(token))
              .retrieve()
              .onStatus(
                  status -> !status.is2xxSuccessful(),
                  (_, res) -> rejectResponse(Operation.PROFILE, res))
              .body(Auth0Profile.class);
      if (profile == null || !validator.validate(profile).isEmpty())
        throw new ProviderFailure(IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE);
      return profile;
    } catch (RestClientException _) {
      throw new ProviderFailure(
          IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE, 503, Instant.MIN);
    }
  }

  /**
   * Translate status and retry headers without reading potentially private provider error bodies.
   *
   * @param operation token or profile metric category
   * @param response provider status and retry headers only
   * @throws IOException response status cannot be read
   * @throws ProviderFailure the non-success response has been classified
   */
  private void rejectResponse(Operation operation, ClientHttpResponse response) throws IOException {
    int status = response.getStatusCode().value();
    if (status == 429)
      metrics
          .counter("blockout.identity.auth0.rate_limited", "operation", operation.value())
          .increment();
    throw new ProviderFailure(
        status == 401 || status == 403
            ? IdentityFailureReason.IDENTITY_CONFIGURATION_ERROR
            : IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE,
        status,
        retryAt(response.getHeaders()));
  }

  /**
   * Uses the later usable provider retry header to avoid retrying before its deadline.
   *
   * @param headers response metadata; no provider body is read
   * @return the later deadline, or Instant.MIN when neither numeric header is usable
   */
  private Instant retryAt(HttpHeaders headers) {
    Instant after = retryTime(headers.getFirst("Retry-After"), clock.instant());
    Instant reset = retryTime(headers.getFirst("X-RateLimit-Reset"), Instant.EPOCH);
    return after.isAfter(reset) ? after : reset;
  }

  /**
   * Interprets numeric Auth0 retry metadata without accepting malformed or overflowing deadlines.
   *
   * @param value nullable nonnegative seconds header
   * @param base current time for Retry-After, Unix epoch for X-RateLimit-Reset
   * @return the deadline, or Instant.MIN when unavailable or invalid
   */
  private Instant retryTime(String value, Instant base) {
    if (value == null) return Instant.MIN;
    try {
      long seconds = Long.parseLong(value.trim());
      return seconds >= 0 ? base.plusSeconds(seconds) : Instant.MIN;
    } catch (NumberFormatException | DateTimeException | ArithmeticException _) {
      return Instant.MIN;
    }
  }

  /**
   * Records elapsed lookup time with a bounded outcome label.
   *
   * @param outcome fixed adapter outcome, never provider prose
   * @param started monotonic start time from System.nanoTime
   */
  private void record(LookupOutcome outcome, long started) {
    metrics
        .timer("blockout.identity.lookup", "outcome", outcome.value())
        .record(System.nanoTime() - started, java.util.concurrent.TimeUnit.NANOSECONDS);
  }

  /** Fixed HTTP operation labels for Auth0 request and rate-limit metrics. */
  private enum Operation {
    TOKEN,
    PROFILE;

    /** Returns the existing lowercase metric label. */
    String value() {
      return name().toLowerCase(java.util.Locale.ROOT);
    }
  }

  /** Complete local lookup classifications; provider error messages are never metric labels. */
  private enum LookupOutcome {
    SUCCESS,
    MISMATCH,
    IDENTITY_PROVIDER_UNAVAILABLE,
    IDENTITY_CONFIGURATION_ERROR;

    /** Preserves the existing success labels and public failure names in monitoring. */
    String value() {
      return switch (this) {
        case SUCCESS, MISMATCH -> name().toLowerCase(java.util.Locale.ROOT);
        case IDENTITY_PROVIDER_UNAVAILABLE, IDENTITY_CONFIGURATION_ERROR -> name();
      };
    }
  }

  /** Carries only safe adapter failure metadata for translation at the provider boundary. */
  private static final class ProviderFailure extends RuntimeException {
    @java.io.Serial private static final long serialVersionUID = 1L;

    private final IdentityFailureReason reason;
    private final int status;
    private final Instant retryAt;

    /**
     * Represents a failure without a provider status or retry deadline.
     *
     * @param reason bounded application failure reason
     */
    ProviderFailure(IdentityFailureReason reason) {
      this(reason, 0, Instant.MIN);
    }

    /**
     * Captures safe response metadata without retaining a response body or credentials.
     *
     * @param reason bounded application failure reason
     * @param status provider HTTP status, or zero when absent
     * @param retryAt provider retry deadline, or Instant.MIN when absent
     */
    ProviderFailure(IdentityFailureReason reason, int status, Instant retryAt) {
      super(reason.name());
      this.reason = reason;
      this.status = status;
      this.retryAt = retryAt;
    }
  }
}
