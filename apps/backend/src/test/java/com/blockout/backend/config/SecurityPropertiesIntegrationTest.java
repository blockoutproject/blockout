package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.util.HashMap;
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

/** Loads actual YAML aliases through native property binding without HTTP or database startup. */
@DisplayName("Backend security startup properties")
class SecurityPropertiesIntegrationTest {
  @ParameterizedTest
  @ValueSource(
      strings = {
        "BLOCKOUT_SECURITY_ISSUER",
        "BLOCKOUT_SECURITY_MOBILE_AUDIENCE",
        "BLOCKOUT_SECURITY_MOBILE_CLIENT_ID",
        "BLOCKOUT_SECURITY_INGESTION_AUDIENCE",
        "BLOCKOUT_SECURITY_INGESTION_CLIENT_ID"
      })
  @DisplayName("Refuses an absent required security environment variable")
  void rejectsAbsentVariable(String missingVariable) {
    // Given
    Map<String, Object> environment = new HashMap<>(validEnvironment());
    environment.remove(missingVariable);

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasFailed();
              assertThat(context.getStartupFailure())
                  .hasRootCauseInstanceOf(BindValidationException.class);
            });
  }

  @Test
  @DisplayName("Binds the existing security environment names")
  void bindsExistingEnvironmentNames() {
    // Given
    Map<String, Object> environment = validEnvironment();

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasNotFailed();
              assertThat(context.getBean(SecurityProperties.class))
                  .isEqualTo(
                      new SecurityProperties(
                          URI.create("https://identity.example.invalid/"),
                          "mobile-test",
                          "mobile-client",
                          "ingestion-test",
                          "collector-client"));
            });
  }

  /**
   * Supplies public trust inputs shared by missing-variable and successful binding scenarios.
   *
   * @return immutable synthetic environment settings
   */
  private static Map<String, Object> validEnvironment() {
    return Map.of(
        "BLOCKOUT_SECURITY_ISSUER", "https://identity.example.invalid/",
        "BLOCKOUT_SECURITY_MOBILE_AUDIENCE", "mobile-test",
        "BLOCKOUT_SECURITY_MOBILE_CLIENT_ID", "mobile-client",
        "BLOCKOUT_SECURITY_INGESTION_AUDIENCE", "ingestion-test",
        "BLOCKOUT_SECURITY_INGESTION_CLIENT_ID", "collector-client");
  }

  /**
   * Prepares native binding against the shipped YAML, isolated from host and test-file defaults.
   *
   * @param environment scenario-owned environment variables
   * @return an unstarted property-binding context
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

  /** Enables only native validation and binding for the owned security settings. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(SecurityProperties.class)
  static class BindingConfiguration {}
}
