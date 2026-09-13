package com.blockout.backend.identity.subscription.application;

import com.blockout.backend.identity.subscription.domain.SubscriptionFailure;
import java.time.Duration;
import java.time.Instant;

/** Provider evidence or an expected failure; provider bodies remain in the adapter. */
public sealed interface SubscriptionObservation {
  /** Complete environment-specific observation; periodEnd is only a scheduling hint. */
  record Verified(boolean positive, Instant periodEnd) implements SubscriptionObservation {}

  /** Failed read and minimum retry delay; permanent failures require a new request. */
  record Failed(SubscriptionFailure reason, Duration retryAfter, boolean permanent)
      implements SubscriptionObservation {}
}
