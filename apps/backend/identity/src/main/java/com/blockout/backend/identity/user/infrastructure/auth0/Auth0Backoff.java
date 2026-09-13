package com.blockout.backend.identity.user.infrastructure.auth0;

import com.blockout.backend.identity.user.application.IdentityFailureReason;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** Per-process pause shared by token and profile calls; no background retry or persisted secret. */
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
final class Auth0Backoff {
  /** Deadline source, injectable for recovery tests. */
  private final Clock clock;

  private Instant retryAt = Instant.MIN;
  private long nextDelaySeconds = 5;
  private IdentityFailureReason failureReason = IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE;

  /**
   * Reads the current pause without extending it or contacting Auth0.
   *
   * @return the safe failure reason while paused, otherwise empty
   */
  synchronized Optional<IdentityFailureReason> blockedReason() {
    return clock.instant().isBefore(retryAt) ? Optional.of(failureReason) : Optional.empty();
  }

  /**
   * Applies progressive delay once per elapsed pause, honoring later provider deadlines.
   *
   * @param reason safe reason returned to callers while paused
   * @param providerRetryAt provider deadline, or Instant.MIN when absent
   * @return true only on entering a new outage, so its owner logs once
   */
  synchronized boolean failed(IdentityFailureReason reason, Instant providerRetryAt) {
    boolean firstFailure = retryAt.equals(Instant.MIN);
    Instant now = clock.instant();
    // Concurrent failures belong to one pause, rather than multiplying the delay per caller.
    if (!now.isBefore(retryAt)) {
      retryAt = now.plusSeconds(nextDelaySeconds);
      nextDelaySeconds = Math.min(nextDelaySeconds * 2, 300);
    }
    if (providerRetryAt.isAfter(retryAt)) retryAt = providerRetryAt;
    failureReason = reason;
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
