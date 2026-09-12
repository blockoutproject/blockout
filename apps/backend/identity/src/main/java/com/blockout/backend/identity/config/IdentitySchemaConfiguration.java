package com.blockout.backend.identity.config;

import com.blockout.backend.identity.infrastructure.health.IdentitySchemaHealthIndicator;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import java.util.List;
import org.springframework.boot.health.contributor.Status;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Shared schema readiness needs no provider credentials in the worker-only assembly. */
@Configuration(proxyBeanMethods = false)
public class IdentitySchemaConfiguration {
  @Bean
  IdentitySchemaHealthIndicator identitySchemaHealthIndicator(
      JdbcTemplate sql, MeterRegistry metrics) {
    var indicator = new IdentitySchemaHealthIndicator(sql);
    metrics.gauge(
        "blockout.schema.ready",
        List.of(Tag.of("schema", "identity")),
        indicator,
        h -> Status.UP.equals(h.health().getStatus()) ? 1 : 0);
    return indicator;
  }
}
