package com.blockout.backend.notifications.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.blockout.backend.notifications.application.NotificationStore;
import com.blockout.backend.notifications.application.PurgeNotifications;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.support.SimpleTriggerContext;

/** Native Spring trigger registration using the shipped configuration, without a database. */
@DisplayName("Daily retention scheduling")
class NotificationRetentionConfigurationTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner()
          .withInitializer(new ConfigDataApplicationContextInitializer())
          .withUserConfiguration(Scheduling.class)
          .withBean(TaskScheduler.class, () -> mock(TaskScheduler.class))
          .withBean(NotificationStore.class, () -> mock(NotificationStore.class))
          .withBean(PurgeNotifications.class, () -> mock(PurgeNotifications.class));

  @Test
  @DisplayName("Disables retention in ordinary backend test contexts")
  void disablesOrdinaryTestCallback() {
    // Given / When
    context.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          assertThat(
                  application
                      .getBean(ScheduledAnnotationBeanPostProcessor.class)
                      .getScheduledTasks())
              .isEmpty();
        });
  }

  @Test
  @DisplayName("Registers the shipped daily UTC trigger across daylight-saving transitions")
  void schedulesEveryUtcDay() {
    // Given
    Instant before = Instant.parse("2026-10-24T03:00:00Z");

    // When
    context
        .withPropertyValues("spring.config.location=classpath:/application.yaml")
        .run(
            application -> {
              ScheduledAnnotationBeanPostProcessor scheduler =
                  application.getBean(ScheduledAnnotationBeanPostProcessor.class);
              ScheduledTask scheduled = scheduler.getScheduledTasks().iterator().next();
              CronTask task = (CronTask) scheduled.getTask();
              SimpleTriggerContext trigger =
                  new SimpleTriggerContext(Clock.fixed(before, ZoneId.of("Europe/Paris")));
              Instant first = task.getTrigger().nextExecution(trigger);
              trigger.update(first, first, first);
              Instant second = task.getTrigger().nextExecution(trigger);

              // Then
              assertThat(scheduler.getScheduledTasks()).hasSize(1);
              assertThat(first).isEqualTo(Instant.parse("2026-10-25T03:00:00Z"));
              assertThat(Duration.between(first, second)).isEqualTo(Duration.ofDays(1));
              task.getRunnable().run();
              verify(application.getBean(PurgeNotifications.class)).run();
            });
  }

  @Test
  @DisplayName("Rejects an invalid retention cron at startup through Spring's native validation")
  void refusesInvalidConfiguration() {
    // Given / When
    context
        .withPropertyValues("blockout.notifications.retention-cron=invalid")
        .run(
            application -> {
              // Then
              assertThat(application).hasFailed();
              assertThat(application.getStartupFailure())
                  .hasRootCauseInstanceOf(IllegalStateException.class);
            });
  }

  /** Imports only the actual schedule; the purge collaborator is controlled by each context. */
  @Configuration(proxyBeanMethods = false)
  @Import(NotificationRetentionConfiguration.class)
  static class Scheduling {}
}
