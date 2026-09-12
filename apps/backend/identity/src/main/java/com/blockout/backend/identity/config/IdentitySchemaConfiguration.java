package com.blockout.backend.identity.config;

import com.blockout.backend.identity.infrastructure.health.IdentitySchemaHealthIndicator;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Shared schema readiness needs no provider credentials in the worker-only assembly. */
@Configuration(proxyBeanMethods = false)
public class IdentitySchemaConfiguration {
  @Bean
  IdentitySchemaHealthIndicator identitySchemaHealthIndicator(JdbcTemplate sql) {
    return new IdentitySchemaHealthIndicator(sql);
  }
}
