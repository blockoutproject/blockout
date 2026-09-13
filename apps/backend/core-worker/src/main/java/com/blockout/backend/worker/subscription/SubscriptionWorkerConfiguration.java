package com.blockout.backend.worker.subscription;

import com.blockout.backend.identity.config.*;
import com.blockout.backend.identity.subscription.application.*;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.*;
import tools.jackson.databind.json.JsonMapper;

/** Worker-only provider credentials, handler and bounded periodic discovery. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(RevenueCatProperties.class)
@Import({SubscriptionConfiguration.class, RevenueCatConfiguration.class})
public class SubscriptionWorkerConfiguration {
  /**
   * Wires the owner handler into existing job dispatch.
   *
   * @param subscriptions owner operations
   * @param provider external read adapter
   * @param clock observation clock
   * @return durable handler
   */
  @Bean
  SubscriptionJobHandler subscriptionJobHandler(
      Subscriptions subscriptions, SubscriptionProvider provider, Clock clock) {
    return new SubscriptionJobHandler(subscriptions, provider, clock, new JsonMapper());
  }

  /**
   * Creates periodic discovery without a second execution queue.
   *
   * @param subscriptions owner scheduling operation
   * @param metrics existing registry
   * @return Spring-managed scanner
   */
  @Bean
  SubscriptionScan subscriptionScan(Subscriptions subscriptions, MeterRegistry metrics) {
    metrics.gauge(
        "blockout.subscription.stale.positive", subscriptions, Subscriptions::stalePositiveCount);
    return new SubscriptionScan(subscriptions, metrics);
  }
}
