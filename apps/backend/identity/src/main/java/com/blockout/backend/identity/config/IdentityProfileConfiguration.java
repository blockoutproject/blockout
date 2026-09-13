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
@Import(SubscriptionConfiguration.class)
public class IdentityProfileConfiguration {
  /**
   * Creates the API-owned Auth0 adapter; Spring closes its HTTP client on bean destruction.
   *
   * @param properties validated origin and Management API credentials
   * @param clock cache and outage-pause clock
   * @param metrics bounded provider metrics
   * @param validator validator for decoded provider attributes
   * @return the read-only provider adapter
   */
  @Bean
  Auth0UserIdentityProvider userIdentityProvider(
      Auth0ProfileProperties properties, Clock clock, MeterRegistry metrics, Validator validator) {
    return new Auth0UserIdentityProvider(properties, clock, metrics, validator);
  }

  /**
   * Connects the profile persistence port to the shared database.
   *
   * @param sql application datasource access
   * @return the store participating in owner transactions
   */
  @Bean
  UserProfileStore userProfileStore(JdbcTemplate sql) {
    return new PostgresUserProfiles(sql);
  }

  /**
   * Creates profile use cases with five-second SQL transactions and retained billing metadata.
   *
   * @param store atomic profile persistence
   * @param provider read-only external identity verification
   * @param manager transaction manager for the profile datasource
   * @param clock creation timestamp source
   * @param billing retained RevenueCat project and environment
   * @param subscriptions atomic initial verification publication
   * @return the identity owner; provider calls finish before transactions
   */
  @Bean
  UserProfiles userProfiles(
      UserProfileStore store,
      UserIdentityProvider provider,
      PlatformTransactionManager manager,
      Clock clock,
      BillingBindingProperties billing,
      com.blockout.backend.identity.subscription.application.Subscriptions subscriptions) {
    TransactionTemplate tx = new TransactionTemplate(manager);
    tx.setTimeout(5);
    return new UserProfiles(
        store,
        provider,
        tx,
        clock,
        billing.projectId(),
        billing.environment(),
        subscriptions::initialize);
  }
}
