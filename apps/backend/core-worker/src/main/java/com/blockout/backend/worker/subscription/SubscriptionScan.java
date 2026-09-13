package com.blockout.backend.worker.subscription;

import com.blockout.backend.identity.subscription.application.Subscriptions;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;

/** Discovers bounded due work; durable jobs retain execution and retry ownership. */
@RequiredArgsConstructor
@Slf4j
public final class SubscriptionScan {
  /** Bounded due-work operation. */
  private final Subscriptions subscriptions;

  /** Process registry. */
  private final MeterRegistry metrics;

  private boolean unavailable;

  /** Publishes due work every 30 seconds; logs only outage transitions and recovery. */
  @Scheduled(fixedDelay = 30000, initialDelay = 30000)
  public void scan() {
    try {
      int count = subscriptions.reconcileDue();
      metrics.counter("blockout.subscription.scan.candidates").increment(count);
      if (unavailable) {
        log.info("Subscription discovery recovered");
        unavailable = false;
      }
    } catch (DataAccessException failure) {
      metrics.counter("blockout.subscription.scan.failures").increment();
      if (!unavailable) {
        log.atWarn()
            .addKeyValue("event.action", "subscription.discovery.unavailable")
            .setCause(failure)
            .log("Subscription discovery unavailable");
        unavailable = true;
      }
    }
  }
}
