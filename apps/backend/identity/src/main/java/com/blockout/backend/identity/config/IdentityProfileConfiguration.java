package com.blockout.backend.identity.config;

import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.infrastructure.auth0.Auth0UserIdentityProvider;
import com.blockout.backend.identity.user.infrastructure.persistence.PostgresUserProfiles;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Validator;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** API-side profile owner; worker assembly does not need Auth0 machine credentials. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties({Auth0ProfileProperties.class, BillingBindingProperties.class})
@Import(IdentitySchemaConfiguration.class)
public class IdentityProfileConfiguration {
  @Bean
  Clock identityClock() {
    return Clock.systemUTC();
  }

  @Bean
  UserIdentityProvider userIdentityProvider(
      Auth0ProfileProperties properties, Clock clock, MeterRegistry metrics, Validator validator) {
    return new Auth0UserIdentityProvider(properties, clock, metrics, validator);
  }

  @Bean
  UserProfileStore userProfileStore(JdbcTemplate sql) {
    return new PostgresUserProfiles(sql);
  }

  @Bean
  UserProfiles userProfiles(
      UserProfileStore store,
      UserIdentityProvider provider,
      PlatformTransactionManager manager,
      Clock clock,
      BillingBindingProperties billing) {
    var tx = new TransactionTemplate(manager);
    tx.setTimeout(5);
    return new UserProfiles(store, provider, tx, clock, billing.projectId(), billing.environment());
  }
}
