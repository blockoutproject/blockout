package com.blockout.backend.notifications.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Real native property binding and bounded executor; no application database or provider. */
@DisplayName("Push environment and worker bounds")
class PushDeliveryConfigurationTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner()
          .withInitializer(new ConfigDataApplicationContextInitializer())
          .withUserConfiguration(PropertiesConfiguration.class);

  @Test
  @DisplayName("The actual YAML keeps external push disabled without credentials")
  void defaultsToDisabled() {
    // Given
    ApplicationContextRunner defaults = context;

    // When
    defaults.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          assertThat(application.getBean(PushProperties.class).enabled()).isFalse();
        });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "",
        "blockout.notifications.push.project-id=00000000-0000-4000-8000-000000000001",
        "blockout.notifications.push.access-token=synthetic",
        "blockout.notifications.push.project-id=invalid"
      })
  @DisplayName("Activation rejects absent or invalid project and server credential inputs")
  void requiresCompleteInputs(String partial) {
    // Given
    ApplicationContextRunner enabled =
        context.withPropertyValues("blockout.notifications.push.enabled=true");
    if (!partial.isEmpty()) enabled = enabled.withPropertyValues(partial);

    // When
    enabled.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }

  @Test
  @DisplayName("Supported environment overrides enable the configured project")
  void bindsConfiguredTransport() {
    // Given
    ApplicationContextRunner configured =
        context.withPropertyValues(
            "blockout.notifications.push.enabled=true",
            "blockout.notifications.push.project-id=00000000-0000-4000-8000-000000000001",
            "blockout.notifications.push.access-token=synthetic");

    // When
    configured.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          assertThat(application.getBean(PushProperties.class).enabled()).isTrue();
        });
  }

  @Test
  @DisplayName("Native executor rejects work beyond its single worker and hundred queued batches")
  void rejectsQueueOverflow() throws Exception {
    // Given
    ThreadPoolTaskExecutor executor = new PushDeliveryConfiguration().pushExecutor();
    CountDownLatch started = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    executor.initialize();
    try {
      executor.execute(
          () -> {
            started.countDown();
            try {
              release.await();
            } catch (InterruptedException interrupted) {
              Thread.currentThread().interrupt();
            }
          });
      assertThat(started.await(3, TimeUnit.SECONDS)).isTrue();
      for (int i = 0; i < 100; i++) executor.execute(() -> {});

      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable extra =
          () -> executor.execute(() -> {});

      // Then
      assertThatThrownBy(extra).isInstanceOf(TaskRejectedException.class);
    } finally {
      release.countDown();
      executor.shutdown();
    }
  }

  /** Enables only native property binding/validation with no application auto-configuration. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(PushProperties.class)
  static class PropertiesConfiguration {}
}
