package com.blockout.backend.identity.user.infrastructure.auth0;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/** Per-process pause shared by token and profile calls; no background retry or persisted secret. */
final class Auth0Backoff {
  private final Clock clock;
  private Instant retryAt = Instant.MIN;
  private long nextDelaySeconds = 5;
  private String failureCode = "IDENTITY_PROVIDER_UNAVAILABLE";

  Auth0Backoff(Clock clock) {
    this.clock = clock;
  }

  synchronized Optional<String> blockedReason() {
    return clock.instant().isBefore(retryAt) ? Optional.of(failureCode) : Optional.empty();
  }

  /** Returns true only when entering a new outage, for one boundary-owned log event. */
  synchronized boolean failed(String code, Instant providerRetryAt) {
    boolean firstFailure = retryAt.equals(Instant.MIN);
    var now = clock.instant();
    // Concurrent failures belong to one pause, rather than multiplying the delay per caller.
    if (!now.isBefore(retryAt)) {
      retryAt = now.plusSeconds(nextDelaySeconds);
      nextDelaySeconds = Math.min(nextDelaySeconds * 2, 300);
    }
    if (providerRetryAt.isAfter(retryAt)) retryAt = providerRetryAt;
    failureCode = code;
    return firstFailure;
  }

  /** Returns true when a successful read ends an outage whose pause has elapsed. */
  synchronized boolean succeeded() {
    // An already-running success must not cancel a pause announced by another request.
    if (retryAt.equals(Instant.MIN) || clock.instant().isBefore(retryAt)) return false;
    retryAt = Instant.MIN;
    nextDelaySeconds = 5;
    return true;
  }
}
