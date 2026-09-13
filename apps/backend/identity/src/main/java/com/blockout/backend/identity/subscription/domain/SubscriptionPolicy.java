package com.blockout.backend.identity.subscription.domain;

import java.time.Duration;
import java.time.Instant;

/** Pure elapsed-time policy shared by consultation and future Pro authorization. */
public final class SubscriptionPolicy {
  public static final Duration FRESHNESS = Duration.ofMinutes(10);
  public static final Duration GRACE = Duration.ofHours(24);

  /** Prevents instances of the pure policy. */
  private SubscriptionPolicy() {}

  /**
   * Evaluates proof without writes or provider calls.
   *
   * @param proof last observation, nullable before the first successful read
   * @param now evaluation instant
   * @return current decision with an exclusive local access deadline
   */
  public static SubscriptionDecision evaluate(SubscriptionEvidence proof, Instant now) {
    if (proof == null || proof.positive() == null || proof.verifiedAt() == null)
      return new SubscriptionDecision(SubscriptionState.UNKNOWN, null);
    Instant freshUntil = earlier(proof.verifiedAt().plus(FRESHNESS), proof.accessExpiresAt());
    if (now.isBefore(freshUntil))
      return new SubscriptionDecision(
          proof.positive() ? SubscriptionState.ACTIVE : SubscriptionState.INACTIVE,
          proof.positive() ? freshUntil : null);
    Instant graceUntil = earlier(proof.verifiedAt().plus(GRACE), proof.accessExpiresAt());
    if (proof.positive()
        && proof.failure() == SubscriptionFailure.UNAVAILABLE
        && now.isBefore(graceUntil))
      return new SubscriptionDecision(SubscriptionState.GRACE, graceUntil);
    return new SubscriptionDecision(SubscriptionState.UNKNOWN, null);
  }

  /**
   * Caps a local deadline by a reliable optional access expiry.
   *
   * @param deadline local freshness or grace deadline
   * @param expiry provider access expiry, nullable
   * @return earlier supported deadline
   */
  private static Instant earlier(Instant deadline, Instant expiry) {
    return expiry != null && expiry.isBefore(deadline) ? expiry : deadline;
  }
}
