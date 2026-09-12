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

@Configuration(proxyBeanMethods = false)
public class JobsConfiguration {
  @Bean
  JobPublisher jobPublisher(JdbcTemplate jdbc) {
    return new PostgresJobPublisher(jdbc, new JsonMapper());
  }

  @Bean
  JobRepository jobRepository(JdbcTemplate jdbc, PlatformTransactionManager manager) {
    var tx = new TransactionTemplate(manager);
    tx.setTimeout(10);
    return new PostgresJobRepository(jdbc, tx);
  }

  @Bean
  SchemaHealthIndicator schemaHealthIndicator(JdbcTemplate jdbc, MeterRegistry registry) {
    var indicator = new SchemaHealthIndicator(jdbc);
    registry.gauge(
        "blockout.schema.ready",
        List.of(Tag.of("schema", "operations")),
        indicator,
        h -> Status.UP.equals(h.health().getStatus()) ? 1 : 0);
    return indicator;
  }
}
