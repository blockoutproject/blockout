package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

/** Native settings binding prevents accidental unbounded provider requests. */
@DisplayName("Auth0 provider deadlines")
class Auth0PropertiesTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner().withUserConfiguration(Settings.class);

  @Test
  @DisplayName("Binds explicit deadlines while leaving provider activation optional")
  void acceptsBoundedUnconfiguredProvider() {
    // Given
    ApplicationContextRunner configured =
        context.withPropertyValues(
            "blockout.accounts.auth0.connect-timeout=3s",
            "blockout.accounts.auth0.read-timeout=5s");

    // When
    configured.run(
        application -> {
          // Then
          assertThat(application).hasNotFailed();
          Auth0Properties properties = application.getBean(Auth0Properties.class);
          assertThat(properties.audience()).isNull();
          assertThat(properties.connectTimeout()).isEqualTo(Duration.ofSeconds(3));
          assertThat(properties.readTimeout()).isEqualTo(Duration.ofSeconds(5));
        });
  }

  @ParameterizedTest
  @ValueSource(strings = {"0ms", "-1s", "invalid"})
  @DisplayName("Rejects unusable deadlines instead of allowing infinite waiting")
  void rejectsUnboundedDeadline(String deadline) {
    // Given
    ApplicationContextRunner configured =
        context.withPropertyValues(
            "blockout.accounts.auth0.connect-timeout=3s",
            "blockout.accounts.auth0.read-timeout=" + deadline);

    // When
    configured.run(
        application -> {
          // Then
          assertThat(application).hasFailed();
        });
  }

  /** Loads only native properties validation, with no runtime credentials, HTTP or database. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(Auth0Properties.class)
  static class Settings {}
}
