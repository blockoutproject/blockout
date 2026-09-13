package com.blockout.backend.sports.config;

import com.blockout.backend.sports.administration.application.FfvbAdministration;
import com.blockout.backend.sports.administration.application.FfvbAdministrationStore;
import com.blockout.backend.sports.administration.infrastructure.PostgresFfvbAdministration;
import com.blockout.backend.sports.administration.infrastructure.SportsSchemaHealthIndicator;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import java.time.Clock;
import java.util.List;
import org.springframework.boot.health.contributor.Status;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Exposes the sports administration owner without adding an executable service. */
@Configuration(proxyBeanMethods = false)
public class SportsConfiguration {
  /**
   * Connects reference persistence to the shared transaction-aware datasource.
   *
   * @param sql shared datasource access
   * @return the reference persistence boundary
   */
  @Bean
  FfvbAdministrationStore ffvbAdministrationStore(JdbcTemplate sql) {
    return new PostgresFfvbAdministration(sql);
  }

  /**
   * Creates the transactional reference owner with a common audit clock.
   *
   * @param store sports reference persistence
   * @param clock audit timestamp source
   * @return the transactional administration use cases
   */
  @Bean
  FfvbAdministration ffvbAdministration(FfvbAdministrationStore store, Clock clock) {
    return new FfvbAdministration(store, clock);
  }

  /**
   * Publishes sports readiness through Actuator and the existing bounded schema gauge.
   *
   * @param sql read-only runtime datasource
   * @param metrics standard Micrometer registry
   * @return the sports schema health contributor
   */
  @Bean
  SportsSchemaHealthIndicator sportsSchemaHealthIndicator(JdbcTemplate sql, MeterRegistry metrics) {
    SportsSchemaHealthIndicator indicator = new SportsSchemaHealthIndicator(sql);
    metrics.gauge(
        "blockout.schema.ready",
        List.of(Tag.of("schema", "sports")),
        indicator,
        health -> Status.UP.equals(health.health().getStatus()) ? 1 : 0);
    return indicator;
  }
}
