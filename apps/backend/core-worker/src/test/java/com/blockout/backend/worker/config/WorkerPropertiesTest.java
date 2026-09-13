package com.blockout.backend.worker.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class WorkerPropertiesTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner()
          .withUserConfiguration(PropertiesConfiguration.class)
          .withPropertyValues(
              "blockout.worker.concurrency=2",
              "blockout.worker.poll=1s",
              "blockout.worker.lease=90s",
              "blockout.worker.renewal=20s",
              "blockout.worker.deadline=120s",
              "blockout.worker.shutdown-grace=30s");

  @ParameterizedTest
  @ValueSource(strings = {"concurrency=0", "poll=0s", "renewal=90s", "shutdown-grace=80s"})
  void rejectsInvalidExecutionSettingsAtStartup(String property) {
    context.withPropertyValues("blockout.worker." + property).run(c -> assertThat(c).hasFailed());
  }

  @Test
  void acceptsConsistentLeaseTiming() {
    context.run(c -> assertThat(c).hasNotFailed());
  }

  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(WorkerProperties.class)
  static class PropertiesConfiguration {}
}
