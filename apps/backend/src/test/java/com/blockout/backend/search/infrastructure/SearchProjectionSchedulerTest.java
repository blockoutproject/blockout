package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.search.application.SearchProjection;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Changed;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Native scheduler binding and transient identity handoff without a second executor. */
@DisplayName("Search serving scheduler")
class SearchProjectionSchedulerTest {
  @Test
  @DisplayName("Defers scope rereads to the same scheduler used for immediate fixed-delay rebuilds")
  void defersOwnerReads() {
    // Given
    SearchProjection projection = mock(SearchProjection.class);
    ThreadPoolTaskScheduler tasks = mock(ThreadPoolTaskScheduler.class);
    SearchProjectionScheduler scheduler =
        new SearchProjectionScheduler(
            projection,
            tasks,
            new SearchProjectionProperties(Duration.ofHours(1)),
            new SimpleMeterRegistry());
    Changed change =
        new Changed(
            Set.of(
                new Scope(
                    SportingProjectionChanges.Kind.CLUB,
                    UUID.fromString("00000000-0000-4000-8000-000000000001"))));

    // When
    scheduler.start(null);
    scheduler.submit(change);

    // Then
    verifyNoInteractions(projection);
    ArgumentCaptor<Runnable> full = ArgumentCaptor.forClass(Runnable.class);
    ArgumentCaptor<Runnable> targeted = ArgumentCaptor.forClass(Runnable.class);
    verify(tasks).scheduleWithFixedDelay(full.capture(), eq(Duration.ofHours(1)));
    verify(tasks).execute(targeted.capture());
    full.getValue().run();
    targeted.getValue().run();
    verify(projection).rebuild();
    verify(projection).update(change.scopes());
  }

  @Test
  @DisplayName("Creates exactly one single-thread scheduler in a search-enabled web context")
  void enablesServingWriter() {
    // Given
    WebApplicationContextRunner context =
        new WebApplicationContextRunner()
            .withUserConfiguration(SearchProjectionConfiguration.class)
            .withBean(SearchProjection.class, () -> mock(SearchProjection.class))
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
            .withBean(SearchProjection.class, () -> mock(SearchProjection.class))
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
            .withBean(SearchProjection.class, () -> mock(SearchProjection.class))
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
