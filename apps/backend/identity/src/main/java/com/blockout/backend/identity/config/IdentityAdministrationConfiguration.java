package com.blockout.backend.identity.config;

import com.blockout.backend.identity.administration.application.AdministratorAccess;
import com.blockout.backend.identity.administration.infrastructure.PostgresAdministratorAccess;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** API-side wiring for local administrator authorization. */
@Configuration(proxyBeanMethods = false)
public class IdentityAdministrationConfiguration {
  /**
   * Exposes current administrator eligibility without a provider dependency.
   *
   * @param sql identity database access
   * @return uncached current administrator lookup
   */
  @Bean
  AdministratorAccess administratorAccess(JdbcTemplate sql) {
    return new PostgresAdministratorAccess(sql);
  }
}
