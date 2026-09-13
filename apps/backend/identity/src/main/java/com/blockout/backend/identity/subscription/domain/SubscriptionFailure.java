package com.blockout.backend.identity.subscription.domain;

/** Safe provider classifications; only transient unavailability permits outage grace. */
public enum SubscriptionFailure {
  UNAVAILABLE,
  CONFIGURATION,
  INVALID_RESPONSE,
  NOT_FOUND
}
