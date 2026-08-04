package com.blockout.users.config;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.auth0.client.auth.AuthAPI;
import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.json.auth.TokenHolder;
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

/** Supplies an expiry-safe Auth0 Management API client to the users service. */
@Service
public class Auth0TokenManager {

  private static final Logger LOGGER = LoggerFactory.getLogger(Auth0TokenManager.class);
  private static final Duration MAX_EARLY_REFRESH_MARGIN = Duration.ofMinutes(1);

  private final Auth0Properties properties;
  private final Clock clock;
  private final TokenFetcher tokenFetcher;

  private volatile ClientState clientState;

  /**
   * Creates the production manager using the system UTC clock and Auth0 client.
   *
   * @param properties Auth0 client and retry configuration
   */
  @Autowired
  public Auth0TokenManager(Auth0Properties properties) {
    this(properties, Clock.systemUTC(), () -> fetchFromAuth0(properties));
  }

  /**
   * Creates a manager with deterministic time and token acquisition boundaries.
   *
   * @param properties Auth0 client and retry configuration
   * @param clock clock used for every token decision
   * @param tokenFetcher token acquisition boundary
   */
  Auth0TokenManager(Auth0Properties properties, Clock clock, TokenFetcher tokenFetcher) {
    this.properties = properties;
    this.clock = clock;
    this.tokenFetcher = tokenFetcher;
  }

  /**
   * Fails application startup when Auth0 cannot provide an immediately usable Management API token.
   */
  @PostConstruct
  public void init() {
    try {
      refreshToken();
    } catch (RuntimeException exception) {
      throw new IllegalStateException("Unable to initialize Auth0 Management API token", exception);
    }
  }

  /**
   * Renews a due client and retains a failed refresh only while the previous client token remains
   * valid.
   *
   * @throws IllegalStateException when no usable Management API client exists after acquisition
   */
  @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
  public synchronized void refreshToken() {
    Instant now = clock.instant();
    ClientState current = clientState;
    if (current != null && now.isBefore(current.refreshAfter())) {
      return;
    }

    try {
      FetchedToken fetched = tokenFetcher.fetch();
      clientState = createClientState(fetched, now);
      LOGGER.info(
          "Auth0 Management API token refreshed",
          keyValue("action", "refresh_management_token_success"),
          keyValue("expires_at", clientState.expiresAt()));
    } catch (Exception exception) {
      handleRefreshFailure(current, now, exception);
    }
  }

  /**
   * Returns a client backed by a token that is valid at the instant of return.
   *
   * @return an Auth0 Management API client with a non-expired token
   * @throws IllegalStateException when Auth0 cannot provide a token and no cached client remains
   *     valid
   */
  public ManagementAPI getManagementAPI() {
    ClientState current = clientState;
    Instant now = clock.instant();
    if (current == null || !now.isBefore(current.refreshAfter())) {
      refreshToken();
      current = clientState;
      now = clock.instant();
    }
    if (current == null || !now.isBefore(current.expiresAt())) {
      clientState = null;
      throw new IllegalStateException("No usable Auth0 Management API client is available");
    }
    return current.managementAPI();
  }

  /**
   * Exposes the current expiry for operational diagnostics.
   *
   * @return the UTC expiry, or {@code null} when no usable client has been acquired
   */
  public LocalDateTime getTokenExpiry() {
    ClientState current = clientState;
    return current == null ? null : LocalDateTime.ofInstant(current.expiresAt(), ZoneOffset.UTC);
  }

  /** Builds an atomic client state whose renewal boundary comes from the provider lifetime. */
  private ClientState createClientState(FetchedToken fetched, Instant acquiredAt) {
    if (fetched == null
        || fetched.accessToken() == null
        || fetched.accessToken().isBlank()
        || fetched.expiresInSeconds() <= 0) {
      throw new IllegalStateException("Auth0 returned an unusable Management API token");
    }

    Duration lifetime = Duration.ofSeconds(fetched.expiresInSeconds());
    Duration margin = lifetime.dividedBy(10);
    if (margin.compareTo(MAX_EARLY_REFRESH_MARGIN) > 0) {
      margin = MAX_EARLY_REFRESH_MARGIN;
    }
    Instant expiresAt = acquiredAt.plus(lifetime);
    ManagementAPI managementAPI =
        ManagementAPI.newBuilder(properties.getDomain(), fetched.accessToken()).build();
    return new ClientState(managementAPI, expiresAt, expiresAt.minus(margin));
  }

  /** Retains a still-valid client and schedules its next bounded attempt before expiry. */
  private void handleRefreshFailure(ClientState current, Instant now, Exception exception) {
    if (current != null && now.isBefore(current.expiresAt())) {
      Duration remaining = Duration.between(now, current.expiresAt());
      Duration retryDelay = properties.getTokenRefreshDelay();
      Duration boundedRetry =
          retryDelay.compareTo(remaining.dividedBy(2)) < 0 ? retryDelay : remaining.dividedBy(2);
      clientState =
          new ClientState(current.managementAPI(), current.expiresAt(), now.plus(boundedRetry));
      LOGGER.warn(
          "Auth0 Management API token refresh failed; retaining the current valid client",
          keyValue("action", "refresh_management_token_retry"),
          keyValue("expires_at", current.expiresAt()),
          exception);
      return;
    }

    clientState = null;
    LOGGER.error(
        "Auth0 Management API token refresh failed with no usable client remaining",
        keyValue("action", "refresh_management_token_failed_closed"),
        exception);
    throw new IllegalStateException(
        "No usable Auth0 Management API client is available", exception);
  }

  /** Acquires one Management API token and its authoritative lifetime from Auth0. */
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

  /** Atomically published Management API client, token expiry, and next allowed refresh attempt. */
  private record ClientState(
      ManagementAPI managementAPI, Instant expiresAt, Instant refreshAfter) {}
}
