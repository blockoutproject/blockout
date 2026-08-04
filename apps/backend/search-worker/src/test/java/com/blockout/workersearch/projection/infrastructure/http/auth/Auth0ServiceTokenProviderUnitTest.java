package com.blockout.workersearch.projection.infrastructure.http.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.workersearch.config.Auth0Properties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies expiry, retry, and concurrency behavior for search worker service tokens. */
@DisplayName("Auth0 service token provider")
class Auth0ServiceTokenProviderUnitTest {

  private static final Instant START = Instant.parse("2026-08-04T10:00:00Z");

  private MutableClock clock;
  private Auth0Properties properties;

  /** Creates deterministic time and retry configuration for each lifecycle scenario. */
  @BeforeEach
  void setUp() {
    clock = new MutableClock(START, ZoneOffset.UTC);
    properties = new Auth0Properties();
    properties.setTokenRefreshDelay(Duration.ofSeconds(30));
  }

  /** Proves startup fails closed when the provider has never acquired a token. */
  @Test
  @DisplayName("fails initial acquisition when no token is available")
  void failsInitialAcquisitionWhenNoTokenIsAvailable() {
    Auth0ServiceTokenProvider provider =
        provider(
            () -> {
              throw new IllegalStateException("provider unavailable");
            });

    assertThatThrownBy(provider::initialize)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Unable to initialize Auth0 service token");
  }

  /** Proves the returned lifetime creates an early-renewal boundary. */
  @Test
  @DisplayName("renews before the provider expiry")
  void renewsBeforeTheProviderExpiry() {
    AtomicInteger acquisitions = new AtomicInteger();
    Auth0ServiceTokenProvider provider =
        provider(
            () ->
                acquisitions.incrementAndGet() == 1
                    ? token("initial", 100)
                    : token("renewed", 100));

    provider.initialize();
    clock.advance(Duration.ofSeconds(91));

    assertThat(provider.getAccessToken()).isEqualTo("renewed");
    assertThat(acquisitions).hasValue(2);
  }

  /** Proves a failed renewal retains a valid token and delays the next bounded attempt. */
  @Test
  @DisplayName("retains a valid token during a transient refresh failure")
  void retainsAValidTokenDuringATransientRefreshFailure() {
    AtomicInteger acquisitions = new AtomicInteger();
    Auth0ServiceTokenProvider provider =
        provider(
            () ->
                switch (acquisitions.incrementAndGet()) {
                  case 1 -> token("initial", 100);
                  case 2 -> throw new IllegalStateException("transient failure");
                  default -> token("renewed", 100);
                });
    provider.initialize();
    clock.advance(Duration.ofSeconds(91));

    assertThat(provider.getAccessToken()).isEqualTo("initial");
    clock.advance(Duration.ofSeconds(4));
    assertThat(provider.getAccessToken()).isEqualTo("initial");
    clock.advance(Duration.ofSeconds(1));
    assertThat(provider.getAccessToken()).isEqualTo("renewed");
    assertThat(acquisitions).hasValue(3);
  }

  /** Proves an expired token is cleared and never returned after refresh failure. */
  @Test
  @DisplayName("refuses an expired token")
  void refusesAnExpiredToken() {
    AtomicInteger acquisitions = new AtomicInteger();
    Auth0ServiceTokenProvider provider =
        provider(
            () -> {
              if (acquisitions.incrementAndGet() == 1) {
                return token("short-lived", 2);
              }
              throw new IllegalStateException("provider unavailable");
            });
    provider.initialize();
    clock.advance(Duration.ofSeconds(2));

    assertThatThrownBy(provider::getAccessToken)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("No usable Auth0 service token is available");
  }

  /** Proves concurrent callers share one atomic renewal result. */
  @Test
  @DisplayName("serializes concurrent renewal")
  void serializesConcurrentRenewal() throws Exception {
    AtomicInteger acquisitions = new AtomicInteger();
    CountDownLatch renewalStarted = new CountDownLatch(1);
    CountDownLatch releaseRenewal = new CountDownLatch(1);
    Auth0ServiceTokenProvider provider =
        provider(
            () -> {
              if (acquisitions.incrementAndGet() == 1) {
                return token("initial", 100);
              }
              renewalStarted.countDown();
              if (!releaseRenewal.await(1, TimeUnit.SECONDS)) {
                throw new IllegalStateException("renewal was not released");
              }
              return token("renewed", 100);
            });
    provider.initialize();
    clock.advance(Duration.ofSeconds(91));
    ExecutorService executor = Executors.newFixedThreadPool(8);

    try {
      List<Future<String>> results = new ArrayList<>();
      results.add(executor.submit(provider::getAccessToken));
      assertThat(renewalStarted.await(1, TimeUnit.SECONDS)).isTrue();
      for (int index = 1; index < 8; index++) {
        results.add(executor.submit(provider::getAccessToken));
      }
      releaseRenewal.countDown();

      for (Future<String> result : results) {
        assertThat(result.get(1, TimeUnit.SECONDS)).isEqualTo("renewed");
      }
      assertThat(acquisitions).hasValue(2);
    } finally {
      executor.shutdownNow();
    }
  }

  /** Creates the provider under test with a controlled acquisition boundary. */
  private Auth0ServiceTokenProvider provider(Auth0ServiceTokenProvider.TokenFetcher tokenFetcher) {
    return new Auth0ServiceTokenProvider(properties, clock, tokenFetcher);
  }

  /** Creates one provider response without involving the Auth0 SDK. */
  private static Auth0ServiceTokenProvider.FetchedToken token(String value, long lifetimeSeconds) {
    return new Auth0ServiceTokenProvider.FetchedToken(value, lifetimeSeconds);
  }

  /** Mutable test clock that advances without sleeps. */
  private static final class MutableClock extends Clock {

    private Instant instant;
    private final ZoneId zone;

    /** Creates a clock at one stable instant and zone. */
    private MutableClock(Instant instant, ZoneId zone) {
      this.instant = instant;
      this.zone = zone;
    }

    /** Advances deterministic time for the next lifecycle decision. */
    private void advance(Duration duration) {
      instant = instant.plus(duration);
    }

    /** {@inheritDoc} */
    @Override
    public ZoneId getZone() {
      return zone;
    }

    /** {@inheritDoc} */
    @Override
    public Clock withZone(ZoneId requestedZone) {
      return new MutableClock(instant, requestedZone);
    }

    /** {@inheritDoc} */
    @Override
    public Instant instant() {
      return instant;
    }
  }
}
