package com.blockout.backend.collection.infrastructure;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Uses the system UTC clock for logical admission timestamps and current due-target selection. */
@Configuration(proxyBeanMethods = false)
class CollectionConfiguration {
  /**
   * Provides the application clock for admission timestamps.
   *
   * @return injectable UTC clock; tests can supply deterministic instants without sleeping
   */
  @Bean
  Clock collectionClock() {
    return Clock.systemUTC();
  }
}
