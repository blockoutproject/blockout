package com.blockout.backend.search.infrastructure;

import com.blockout.backend.search.application.ProjectSearch;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Serving-process-only single writer; operator and migration contexts enqueue no index work. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication
@ConditionalOnProperty(prefix = "blockout.search", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(SearchProjectionProperties.class)
public class SearchProjectionConfiguration {
  /**
   * @return dedicated one-thread native scheduler, stopped with the serving context
   */
  @Bean(defaultCandidate = false)
  ThreadPoolTaskScheduler searchProjectionTasks() {
    ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
    scheduler.setPoolSize(1);
    scheduler.setThreadNamePrefix("search-projection-");
    return scheduler;
  }

  /**
   * Connects the existing diagnostic registry and owner use cases to the dedicated scheduler.
   *
   * @param projection current-state use cases
   * @param searchProjectionTasks dedicated serialized execution owner
   * @param properties validated regular catch-up cadence
   * @param registry existing native metrics registry
   * @return transient event and startup scheduling boundary
   */
  @Bean
  SearchProjectionScheduler searchProjectionScheduler(
      ProjectSearch projection,
      @org.springframework.beans.factory.annotation.Qualifier("searchProjectionTasks")
          ThreadPoolTaskScheduler searchProjectionTasks,
      SearchProjectionProperties properties,
      MeterRegistry registry) {
    return new SearchProjectionScheduler(projection, searchProjectionTasks, properties, registry);
  }
}
