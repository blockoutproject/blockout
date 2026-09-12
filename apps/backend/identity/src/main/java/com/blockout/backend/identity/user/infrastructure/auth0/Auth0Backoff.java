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

  synchronized void failed(String code, Instant providerRetryAt) {
    var now = clock.instant();
    // Concurrent failures belong to one pause, rather than multiplying the delay per caller.
    if (!now.isBefore(retryAt)) {
      retryAt = now.plusSeconds(nextDelaySeconds);
      nextDelaySeconds = Math.min(nextDelaySeconds * 2, 300);
    }
    if (providerRetryAt.isAfter(retryAt)) retryAt = providerRetryAt;
    failureCode = code;
  }

  synchronized void succeeded() {
    // An already-running success must not cancel a pause announced by another request.
    if (!clock.instant().isBefore(retryAt)) nextDelaySeconds = 5;
  }
}
