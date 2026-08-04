package com.blockout.notifications.notification.infrastructure.http;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.auth0.client.auth.AuthAPI;
import com.auth0.json.auth.TokenHolder;
import com.blockout.notifications.config.Auth0Properties;
import jakarta.annotation.PostConstruct;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Supplies expiry-safe Auth0 machine-to-machine access tokens to notification HTTP clients. */
@Service
public class Auth0ServiceTokenProvider {

  private static final Logger LOGGER = LoggerFactory.getLogger(Auth0ServiceTokenProvider.class);
  private static final Duration MAX_EARLY_REFRESH_MARGIN = Duration.ofMinutes(1);
  private static final boolean M2M_ENABLED = true;

  private final Auth0Properties auth0Properties;
  private final Clock clock;
  private final TokenFetcher tokenFetcher;

  private volatile TokenState tokenState;

  /**
   * Creates the production provider using the system UTC clock and Auth0 client.
   *
   * @param auth0Properties Auth0 client and retry configuration
   */
  @Autowired
  public Auth0ServiceTokenProvider(Auth0Properties auth0Properties) {
    this(auth0Properties, Clock.systemUTC(), () -> fetchFromAuth0(auth0Properties));
  }

  /**
   * Creates a provider with deterministic time and token acquisition boundaries.
   *
   * @param auth0Properties Auth0 client and retry configuration
   * @param clock clock used for every token decision
   * @param tokenFetcher token acquisition boundary
   */
  Auth0ServiceTokenProvider(
      Auth0Properties auth0Properties, Clock clock, TokenFetcher tokenFetcher) {
    this.auth0Properties = auth0Properties;
    this.clock = clock;
    this.tokenFetcher = tokenFetcher;
  }

  /** Fails application startup when Auth0 cannot provide an immediately usable token. */
  @PostConstruct
  public void init() {
    if (!M2M_ENABLED) {
      LOGGER.warn("Auth0 M2M bypass enabled", keyValue("action", "auth0_bypass_enabled"));
      return;
    }

    try {
      refreshToken();
    } catch (RuntimeException exception) {
      throw new IllegalStateException("Unable to initialize Auth0 service token", exception);
    }
  }

  /**
   * Renews a due token and retains a failed refresh only while the previous token remains valid.
   *
   * @throws IllegalStateException when no usable token exists after acquisition
   */
  @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
  public synchronized void refreshToken() {
    if (!M2M_ENABLED) {
      return;
    }

    Instant now = clock.instant();
    TokenState current = tokenState;
    if (current != null && now.isBefore(current.refreshAfter())) {
      return;
    }

    try {
      FetchedToken fetched = tokenFetcher.fetch();
      tokenState = createTokenState(fetched, now);
      LOGGER.info(
          "Auth0 service token refreshed",
          keyValue("action", "refresh_token_success"),
          keyValue("expires_at", tokenState.expiresAt()));
    } catch (Exception exception) {
      handleRefreshFailure(current, now, exception);
    }
  }

  /**
   * Returns a token that is valid at the instant of return, renewing it when its early-refresh
   * boundary is due.
   *
   * @return a non-expired Auth0 access token
   * @throws IllegalStateException when Auth0 cannot provide a token and no cached token remains
   *     valid
   */
  public String getAccessToken() {
    TokenState current = tokenState;
    Instant now = clock.instant();
    if (current == null || !now.isBefore(current.refreshAfter())) {
      refreshToken();
      current = tokenState;
      now = clock.instant();
    }
    if (current == null || !now.isBefore(current.expiresAt())) {
      tokenState = null;
      throw new IllegalStateException("No usable Auth0 service token is available");
    }
    return current.accessToken();
  }

  /**
   * Exposes the current expiry for operational diagnostics.
   *
   * @return the UTC expiry, or {@code null} when no usable token has been acquired
   */
  public LocalDateTime getTokenExpiry() {
    TokenState current = tokenState;
    return current == null ? null : LocalDateTime.ofInstant(current.expiresAt(), ZoneOffset.UTC);
  }

  /** Builds an atomic token state whose renewal boundary comes from the provider lifetime. */
  private TokenState createTokenState(FetchedToken fetched, Instant acquiredAt) {
    if (fetched == null
        || fetched.accessToken() == null
        || fetched.accessToken().isBlank()
        || fetched.expiresInSeconds() <= 0) {
      throw new IllegalStateException("Auth0 returned an unusable service token");
    }

    Duration lifetime = Duration.ofSeconds(fetched.expiresInSeconds());
    Duration margin = lifetime.dividedBy(10);
    if (margin.compareTo(MAX_EARLY_REFRESH_MARGIN) > 0) {
      margin = MAX_EARLY_REFRESH_MARGIN;
    }
    Instant expiresAt = acquiredAt.plus(lifetime);
    return new TokenState(fetched.accessToken(), expiresAt, expiresAt.minus(margin));
  }

  /** Retains a still-valid token and schedules its next bounded attempt before expiry. */
  private void handleRefreshFailure(TokenState current, Instant now, Exception exception) {
    if (current != null && now.isBefore(current.expiresAt())) {
      Duration remaining = Duration.between(now, current.expiresAt());
      Duration retryDelay = auth0Properties.getTokenRefreshDelay();
      Duration boundedRetry =
          retryDelay.compareTo(remaining.dividedBy(2)) < 0 ? retryDelay : remaining.dividedBy(2);
      tokenState =
          new TokenState(current.accessToken(), current.expiresAt(), now.plus(boundedRetry));
      LOGGER.warn(
          "Auth0 service token refresh failed; retaining the current valid token",
          keyValue("action", "refresh_token_retry"),
          keyValue("expires_at", current.expiresAt()),
          exception);
      return;
    }

    tokenState = null;
    LOGGER.error(
        "Auth0 service token refresh failed with no usable token remaining",
        keyValue("action", "refresh_token_failed_closed"),
        exception);
    throw new IllegalStateException("No usable Auth0 service token is available", exception);
  }

  /** Acquires one token and its authoritative lifetime from Auth0. */
  private static FetchedToken fetchFromAuth0(Auth0Properties properties) throws Exception {
    AuthAPI auth =
        AuthAPI.newBuilder(
                properties.getDomain(), properties.getClientId(), properties.getClientSecret())
            .build();
    TokenHolder holder = auth.requestToken(properties.getAudience()).execute().getBody();
    return new FetchedToken(holder.getAccessToken(), holder.getExpiresIn());
  }

  /** Testable boundary for acquiring an Auth0 token without exposing provider SDK state. */
  @FunctionalInterface
  interface TokenFetcher {
    /**
     * Acquires one token response.
     *
     * @return the access token and provider-reported lifetime
     * @throws Exception when acquisition fails
     */
    FetchedToken fetch() throws Exception;
  }

  /** Immutable token response required by the lifecycle policy. */
  record FetchedToken(String accessToken, long expiresInSeconds) {}

  /** Atomically published token, expiry, and next allowed refresh attempt. */
  private record TokenState(String accessToken, Instant expiresAt, Instant refreshAfter) {}
}
