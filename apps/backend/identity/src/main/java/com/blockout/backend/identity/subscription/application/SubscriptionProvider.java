package com.blockout.backend.identity.subscription.application;

/** Read-only external subscription boundary; calls occur outside SQL transactions. */
public interface SubscriptionProvider {
  /**
   * Reads complete evidence for an exact retained binding.
   *
   * @param binding owner and provider namespace
   * @return verified evidence or a safe failure
   * @throws InterruptedException when worker shutdown/deadline interrupts the read
   */
  SubscriptionObservation read(BillingBinding binding) throws InterruptedException;
}
