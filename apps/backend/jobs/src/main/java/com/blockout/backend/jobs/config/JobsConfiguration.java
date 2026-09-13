package com.blockout.backend.jobs.config;

import com.blockout.backend.jobs.application.JobPublisher;
import com.blockout.backend.jobs.application.JobRepository;
import com.blockout.backend.jobs.infrastructure.health.SchemaHealthIndicator;
import com.blockout.backend.jobs.infrastructure.persistence.PostgresJobPublisher;
import com.blockout.backend.jobs.infrastructure.persistence.PostgresJobRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import java.util.List;
import org.springframework.boot.health.contributor.Status;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

/** Wires the shared queue ports, short transaction boundary and operations-schema readiness. */
@Configuration(proxyBeanMethods = false)
public class JobsConfiguration {
  /**
   * Creates the publisher that joins the calling owner transaction.
   *
   * @param jdbc shared job datasource access
   * @return the transactional publication port
   */
  @Bean
  JobPublisher jobPublisher(JdbcTemplate jdbc) {
    return new PostgresJobPublisher(jdbc, new JsonMapper());
  }

  /**
   * Creates lease operations with a ten-second transaction timeout.
   *
   * @param jdbc queue datasource access
   * @param manager transaction manager for the same datasource
   * @return the fenced queue persistence port
   */
  @Bean
  JobRepository jobRepository(JdbcTemplate jdbc, PlatformTransactionManager manager) {
    TransactionTemplate tx = new TransactionTemplate(manager);
    tx.setTimeout(10);
    return new PostgresJobRepository(jdbc, tx);
  }

  /**
   * Registers read-only schema readiness and its bounded operations metric.
   *
   * @param jdbc operations schema access
   * @param registry application-owned metrics registry
   * @return the indicator used by Actuator and worker scheduling
   */
  @Bean
  SchemaHealthIndicator schemaHealthIndicator(JdbcTemplate jdbc, MeterRegistry registry) {
    SchemaHealthIndicator indicator = new SchemaHealthIndicator(jdbc);
    registry.gauge(
        "blockout.schema.ready",
        List.of(Tag.of("schema", "operations")),
        indicator,
        h -> Status.UP.equals(h.health().getStatus()) ? 1 : 0);
    return indicator;
  }
}
