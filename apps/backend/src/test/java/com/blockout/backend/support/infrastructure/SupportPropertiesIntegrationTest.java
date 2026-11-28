package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.servlet.autoconfigure.MultipartProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;

/** Exercises shipped multipart defaults and native binding of server-only support configuration. */
@DisplayName("Support configuration")
class SupportPropertiesIntegrationTest {
  @Test
  @DisplayName("Sets exact file and complete multipart request byte limits")
  void bindsMultipartLimits() {
    // Given
    ApplicationContextRunner application = application();

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          MultipartProperties multipart = context.getBean(MultipartProperties.class);
          assertThat(multipart.getMaxFileSize().toBytes()).isEqualTo(5_242_880);
          assertThat(multipart.getMaxRequestSize().toBytes()).isEqualTo(27_262_976);
          // Accepted parts stay in bounded memory; profile images have no staged disk upload.
          assertThat(multipart.getFileSizeThreshold().toBytes())
              .isEqualTo(multipart.getMaxFileSize().toBytes());
        });
  }

  @Test
  @DisplayName("Leaves the destination absent while binding positive bounded waits")
  void bindsUnconfiguredFoundation() {
    // Given
    ApplicationContextRunner application = application();

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          SupportProperties settings = context.getBean(SupportProperties.class);
          assertThat(settings.destination()).isNull();
          assertThat(settings.connectTimeout()).isEqualTo(Duration.ofSeconds(3));
          assertThat(settings.readTimeout()).isEqualTo(Duration.ofSeconds(5));
          assertThat(settings.processTimeout()).isEqualTo(Duration.ofSeconds(30));
        });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "repository",
        "incomplete-label",
        "complete-label",
        "github-token",
        "discord-webhook"
      })
  @DisplayName("Rejects incomplete destination configuration")
  void rejectsIncompleteDestination(String field) {
    // Given
    ApplicationContextRunner application =
        configuredDestination().withPropertyValues("blockout.support.destination." + field + "=");

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
          assertThat(context.getStartupFailure())
              .hasRootCauseInstanceOf(
                  org.springframework.boot.context.properties.bind.validation
                      .BindValidationException.class);
        });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "connect-timeout=0s",
        "read-timeout=-1s",
        "process-timeout=0s",
        "process-timeout=invalid"
      })
  @DisplayName("Rejects absent or unbounded waits through native binding")
  void rejectsInvalidTimeout(String setting) {
    // Given
    ApplicationContextRunner application =
        application().withPropertyValues("blockout.support." + setting);

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
        });
  }

  @Test
  @DisplayName("Binds fixed provider settings without exposing credentials in object rendering")
  void bindsDestination() {
    // Given
    ApplicationContextRunner application = configuredDestination();

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          SupportProperties settings = context.getBean(SupportProperties.class);
          assertThat(settings.destination().repository())
              .isEqualTo("fictional-org/private-support");
          assertThat(settings.destination().completeLabel()).isEqualTo("intake-complete");
          assertThat(settings.destination().incompleteLabel()).isEqualTo("intake-incomplete");
          assertThat(settings.destination().githubToken()).isEqualTo("synthetic-token");
          assertThat(settings.toString())
              .doesNotContain("synthetic-token", "webhooks", "private-support");
        });
  }

  @ParameterizedTest
  @ValueSource(strings = {"intake-incomplete", "INTAKE-INCOMPLETE"})
  @DisplayName("Rejects indistinguishable incomplete and complete intake labels")
  void rejectsIdenticalLabels(String completeLabel) {
    // Given
    ApplicationContextRunner application =
        configuredDestination()
            .withPropertyValues("blockout.support.destination.complete-label=" + completeLabel);

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
        });
  }

  /** Supplies fictional values only; no provider is contacted or qualified. */
  private static ApplicationContextRunner configuredDestination() {
    return application()
        .withPropertyValues(
            "blockout.support.destination.repository=fictional-org/private-support",
            "blockout.support.destination.incomplete-label=intake-incomplete",
            "blockout.support.destination.complete-label=intake-complete",
            "blockout.support.destination.github-token=synthetic-token",
            "blockout.support.destination.discord-webhook=https://discord.com/api/webhooks/1/synthetic-token");
  }

  /** Uses only committed YAML and synthetic overrides, never host secrets. */
  private static ApplicationContextRunner application() {
    return new ApplicationContextRunner()
        .withPropertyValues("spring.config.location=classpath:/application.yaml")
        .withInitializer(
            context -> {
              context
                  .getEnvironment()
                  .getPropertySources()
                  .remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
              context
                  .getEnvironment()
                  .getPropertySources()
                  .remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
            })
        .withInitializer(new ConfigDataApplicationContextInitializer())
        .withUserConfiguration(BindingConfiguration.class);
  }

  /** Loads framework multipart configuration without a web server or provider. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties({MultipartProperties.class, SupportProperties.class})
  static class BindingConfiguration {}
}
