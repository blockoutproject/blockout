package com.blockout.backend.identity.subscription.domain;

/** Local entitlement decisions, independent of provider billing statuses. */
public enum SubscriptionState {
  ACTIVE,
  GRACE,
  INACTIVE,
  UNKNOWN
}
