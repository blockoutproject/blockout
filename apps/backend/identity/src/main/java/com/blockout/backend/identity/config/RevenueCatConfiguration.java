package com.blockout.backend.identity.config;

import com.blockout.backend.identity.subscription.infrastructure.revenuecat.RevenueCatSubscriptions;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;

/** Worker-imported provider wiring keeps the implementation inside the identity module. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RevenueCatProperties.class)
public class RevenueCatConfiguration {
  /**
   * Creates the read-only client; Spring closes its HTTP resources.
   *
   * @param properties validated worker-only settings
   * @param clock pause clock
   * @param metrics bounded diagnostics
   * @return provider adapter
   */
  @Bean
  RevenueCatSubscriptions revenueCatSubscriptions(
      RevenueCatProperties properties, Clock clock, MeterRegistry metrics) {
    return new RevenueCatSubscriptions(properties, clock, metrics);
  }
}
