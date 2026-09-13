package com.blockout.backend.identity.subscription.domain;

import java.util.Locale;

/**
 * RevenueCat namespace retained with each customer binding; production never reads sandbox rights.
 */
public enum BillingEnvironment {
  PRODUCTION,
  SANDBOX;

  /** Returns the lowercase namespace required by RevenueCat V2 and existing persisted bindings. */
  public String value() {
    return name().toLowerCase(Locale.ROOT);
  }
}
