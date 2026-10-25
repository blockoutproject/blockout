package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.blockout.backend.search.application.ProjectSearch;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Verifies Spring scheduler selection and validated properties in minimal native contexts. */
@DisplayName("Search projection Spring configuration")
class SearchProjectionConfigurationIntegrationTest {
  @Test
  @DisplayName("Creates exactly one single-thread scheduler in a search-enabled web context")
  void enablesServingWriter() {
    // Given
    WebApplicationContextRunner context =
        new WebApplicationContextRunner()
            .withUserConfiguration(SearchProjectionConfiguration.class)
            .withBean(ProjectSearch.class, () -> mock(ProjectSearch.class))
            .withBean(io.micrometer.core.instrument.MeterRegistry.class, SimpleMeterRegistry::new)
            .withPropertyValues(
                "blockout.search.enabled=true", "blockout.search.projection.full-rebuild-delay=1h");

    // When
    context.run(
        application -> {
          // Then
          assertThat(application)
              .hasSingleBean(ThreadPoolTaskScheduler.class)
              .hasSingleBean(SearchProjectionScheduler.class);
          assertThat(
                  application
                      .getBean(ThreadPoolTaskScheduler.class)
                      .getScheduledThreadPoolExecutor()
                      .getCorePoolSize())
              .isEqualTo(1);
        });
  }

  @Test
  @DisplayName("Keeps ordinary Spring scheduled jobs on their own default scheduler")
  void preservesDefaultScheduler() {
    // Given
    WebApplicationContextRunner context =
        new WebApplicationContextRunner()
            .withConfiguration(
                org.springframework.boot.autoconfigure.AutoConfigurations.of(
                    org.springframework.boot.autoconfigure.task.TaskSchedulingAutoConfiguration
                        .class))
            .withUserConfiguration(SearchProjectionConfiguration.class, OrdinaryScheduling.class)
            .withBean(ProjectSearch.class, () -> mock(ProjectSearch.class))
            .withBean(io.micrometer.core.instrument.MeterRegistry.class, SimpleMeterRegistry::new)
            .withPropertyValues(
                "blockout.search.enabled=true", "blockout.search.projection.full-rebuild-delay=1h");

    // When
    context.run(
        application -> {
          // Then
          assertThat(application).hasBean("taskScheduler").hasBean("searchProjectionTasks");
          assertThat(
                  application
                      .getBeanFactory()
                      .resolveNamedBean(org.springframework.scheduling.TaskScheduler.class)
                      .getBeanName())
              .isEqualTo("taskScheduler");
          assertThat(application.getBean("taskScheduler"))
              .isNotSameAs(application.getBean("searchProjectionTasks"));
        });
  }

  /** Enables native ordinary scheduling as other feature owners do in the serving application. */
  @org.springframework.context.annotation.Configuration(proxyBeanMethods = false)
  @org.springframework.scheduling.annotation.EnableScheduling
  static class OrdinaryScheduling {}

  @Test
  @DisplayName("Starts no search scheduler in a non-web operator context")
  void disablesNonWebWriter() {
    // Given
    ApplicationContextRunner context =
        new ApplicationContextRunner()
            .withUserConfiguration(SearchProjectionConfiguration.class)
            .withPropertyValues(
                "blockout.search.enabled=true", "blockout.search.projection.full-rebuild-delay=1h");

    // When
    context.run(
        application -> {
          // Then
          assertThat(application)
              .doesNotHaveBean(ThreadPoolTaskScheduler.class)
              .doesNotHaveBean(SearchProjectionScheduler.class);
        });
  }

  @Test
  @DisplayName("Rejects a nonpositive full-run delay through native configuration validation")
  void validatesDelay() {
    // Given
    WebApplicationContextRunner context =
        new WebApplicationContextRunner()
            .withUserConfiguration(SearchProjectionConfiguration.class)
            .withBean(ProjectSearch.class, () -> mock(ProjectSearch.class))
            .withBean(io.micrometer.core.instrument.MeterRegistry.class, SimpleMeterRegistry::new)
            .withPropertyValues(
                "blockout.search.enabled=true", "blockout.search.projection.full-rebuild-delay=0s");

    // When
    context.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }
}
