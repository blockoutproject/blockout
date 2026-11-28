package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.validation.BindValidationException;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/** Real shipped YAML, native binding and validation; no acquisition or HTTP client is started. */
@DisplayName("Collector ingestion property binding")
class IngestionPropertiesIntegrationTest {
  @Test
  @DisplayName("Refuses an absent audience environment variable")
  void rejectsAbsentAudience() {
    // Given
    ApplicationContextRunner application = application(Map.of());

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
          assertThat(context.getStartupFailure())
              .hasRootCauseInstanceOf(BindValidationException.class);
        });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "blockout.ingestion.audience=",
        "blockout.ingestion.audience= ",
        "blockout.ingestion.base-url=",
        "blockout.ingestion.base-url=/relative",
        "blockout.ingestion.base-url=ftp://api.example.invalid",
        "blockout.ingestion.timeout=0s",
        "blockout.ingestion.timeout=-1s",
        "blockout.ingestion.timeout="
      })
  @DisplayName("Refuses invalid ingestion settings during native binding")
  void rejectsInvalidSettings(String property) {
    // Given
    ApplicationContextRunner configured =
        application(Map.of("BLOCKOUT_INGESTION_AUDIENCE", "ingestion-test"))
            .withPropertyValues(property);

    // When
    configured.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
          assertThat(context.getStartupFailure())
              .hasRootCauseInstanceOf(BindValidationException.class);
        });
  }

  @Test
  @DisplayName("Preserves the local backend URL and bounded default timeout")
  void preservesLocalDefaults() {
    // Given
    ApplicationContextRunner application =
        application(Map.of("BLOCKOUT_INGESTION_AUDIENCE", "ingestion-test"));

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          IngestionProperties properties = context.getBean(IngestionProperties.class);
          assertThat(properties.timeout()).isEqualTo(Duration.ofSeconds(15));
          assertThat(properties.baseUrl()).isEqualTo("http://localhost:8080");
        });
  }

  @Test
  @DisplayName("Binds the existing environment names to ingestion settings")
  void bindsExistingEnvironmentNames() {
    // Given
    ApplicationContextRunner application =
        application(
            Map.of(
                "BLOCKOUT_INGESTION_BASE_URL", "https://api.example.invalid",
                "BLOCKOUT_INGESTION_AUDIENCE", "ingestion-preproduction",
                "BLOCKOUT_INGESTION_TIMEOUT", "250ms"));

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          IngestionProperties properties = context.getBean(IngestionProperties.class);
          assertThat(properties.audience()).isEqualTo("ingestion-preproduction");
          assertThat(properties.timeout()).isEqualTo(Duration.ofMillis(250));
          assertThat(properties.baseUrl()).isEqualTo("https://api.example.invalid");
        });
  }

  /**
   * Loads only the shipped YAML and property owner in an environment independent from the host.
   *
   * @param environment scenario-owned deployment aliases
   * @return an unstarted runner that closes its context after each assertion callback
   */
  private static ApplicationContextRunner application(Map<String, Object> environment) {
    return new ApplicationContextRunner()
        .withPropertyValues("spring.config.location=classpath:/application.yaml")
        .withInitializer(
            context -> {
              context
                  .getEnvironment()
                  .getPropertySources()
                  .replace(
                      StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                      new SystemEnvironmentPropertySource(
                          StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                          environment));
              context
                  .getEnvironment()
                  .getPropertySources()
                  .remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
            })
        .withInitializer(new ConfigDataApplicationContextInitializer())
        .withUserConfiguration(BindingConfiguration.class);
  }

  /** Enables native ingestion binding and Bean Validation without application startup. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(IngestionProperties.class)
  static class BindingConfiguration {}
}
