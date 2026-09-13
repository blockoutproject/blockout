package com.blockout.backend.identity.config;

import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.identity.subscription.infrastructure.persistence.PostgresSubscriptions;
import com.blockout.backend.jobs.application.*;
import java.time.Clock;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Shared owner wiring, without provider credentials in the API process. */
@Configuration(proxyBeanMethods = false)
@Import(IdentitySchemaConfiguration.class)
public class SubscriptionConfiguration {
  /**
   * Supplies UTC to both identity features.
   *
   * @return injectable owner clock
   */
  @Bean
  Clock identityClock() {
    return Clock.systemUTC();
  }

  /**
   * Binds identity persistence to the application datasource.
   *
   * @param sql transaction-aware JDBC operations
   * @return subscription storage boundary
   */
  @Bean
  SubscriptionStore subscriptionStore(JdbcTemplate sql) {
    return new PostgresSubscriptions(sql);
  }

  /**
   * Wires subscription operations with short SQL transactions.
   *
   * @param store owner persistence
   * @param publisher durable transactional publication
   * @param jobs queue state boundary
   * @param manager shared datasource transaction manager
   * @param clock owner clock
   * @return subscription owner
   */
  @Bean
  Subscriptions subscriptions(
      SubscriptionStore store,
      JobPublisher publisher,
      JobRepository jobs,
      PlatformTransactionManager manager,
      Clock clock) {
    var tx = new TransactionTemplate(manager);
    tx.setTimeout(5);
    return new Subscriptions(store, publisher, jobs, tx, clock);
  }
}
