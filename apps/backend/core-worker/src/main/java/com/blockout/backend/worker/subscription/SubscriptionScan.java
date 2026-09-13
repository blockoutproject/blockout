package com.blockout.backend.worker.subscription;

import com.blockout.backend.identity.subscription.application.Subscriptions;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;

/** Discovers bounded due work; durable jobs retain execution and retry ownership. */
public final class SubscriptionScan {
  private static final Logger LOG = LoggerFactory.getLogger(SubscriptionScan.class);
  private final Subscriptions subscriptions;
  private final MeterRegistry metrics;
  private boolean unavailable;

  /**
   * Binds the scanner to the owner and low-cardinality diagnostics.
   *
   * @param subscriptions bounded due-work operation
   * @param metrics process registry
   */
  public SubscriptionScan(Subscriptions subscriptions, MeterRegistry metrics) {
    this.subscriptions = subscriptions;
    this.metrics = metrics;
  }

  /** Publishes due work every 30 seconds; logs only outage transitions and recovery. */
  @Scheduled(fixedDelay = 30000, initialDelay = 30000)
  public void scan() {
    try {
      int count = subscriptions.reconcileDue();
      metrics.counter("blockout.subscription.scan.candidates").increment(count);
      if (unavailable) {
        LOG.info("Subscription discovery recovered");
        unavailable = false;
      }
    } catch (DataAccessException failure) {
      metrics.counter("blockout.subscription.scan.failures").increment();
      if (!unavailable) {
        LOG.atWarn()
            .addKeyValue("event.action", "subscription.discovery.unavailable")
            .setCause(failure)
            .log("Subscription discovery unavailable");
        unavailable = true;
      }
    }
  }
}
