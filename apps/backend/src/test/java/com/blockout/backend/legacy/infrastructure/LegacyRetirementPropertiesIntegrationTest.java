package com.blockout.backend.legacy.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.validation.BindValidationException;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/** Exercises native configuration binding and validation without database or provider startup. */
@DisplayName("Fixed legacy retirement configuration")
class LegacyRetirementPropertiesIntegrationTest {
  @Test
  @DisplayName(
      "Binds both independent release versions and store destinations from the environment")
  void bindsRetirementInputs() {
    // Given
    Map<String, Object> environment = validEnvironment();

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasNotFailed();
              LegacyRetirementProperties properties =
                  context.getBean(LegacyRetirementProperties.class);
              assertThat(properties)
                  .isEqualTo(
                      new LegacyRetirementProperties(
                          "2.0.0",
                          "2.10.0",
                          "https://apps.apple.com/app/id123456789",
                          "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout"));
              assertThat(properties.isConfigured()).isTrue();
            });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "BLOCKOUT_LEGACY_MINVERSIONIOS",
        "BLOCKOUT_LEGACY_MINVERSIONANDROID",
        "BLOCKOUT_LEGACY_STOREURLIOS",
        "BLOCKOUT_LEGACY_STOREURLANDROID"
      })
  @DisplayName("Leaves retirement unavailable when any required input is absent")
  void requiresEveryInput(String missingVariable) {
    // Given
    Map<String, Object> environment = new HashMap<>(validEnvironment());
    environment.remove(missingVariable);

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasNotFailed();
              assertThat(context.getBean(LegacyRetirementProperties.class).isConfigured())
                  .isFalse();
            });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "blockout.legacy.min-version-ios=",
        "blockout.legacy.min-version-ios=2.0",
        "blockout.legacy.min-version-ios=2.0.0-beta",
        "blockout.legacy.min-version-ios=02.0.0",
        "blockout.legacy.min-version-android=two",
        "blockout.legacy.store-url-ios=",
        "blockout.legacy.store-url-ios=http://apps.apple.com/app/id123456789",
        "blockout.legacy.store-url-ios=https://apps.apple.com.example.invalid/app/id123456789",
        "blockout.legacy.store-url-android=https://example.invalid/app",
        "blockout.legacy.store-url-android=not a URL"
      })
  @DisplayName("Rejects malformed supplied values instead of publishing a broken update action")
  void rejectsMalformedInputs(String invalidProperty) {
    // Given
    ApplicationContextRunner application =
        application(validEnvironment()).withPropertyValues(invalidProperty);

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
          assertThat(context.getStartupFailure())
              .hasRootCauseInstanceOf(BindValidationException.class);
        });
  }

  /**
   * Supplies fictional release/listing values; this is not a release qualification inventory.
   *
   * @return the four environment settings required for the read to be available
   */
  private static Map<String, Object> validEnvironment() {
    return Map.of(
        "BLOCKOUT_LEGACY_MINVERSIONIOS", "2.0.0",
        "BLOCKOUT_LEGACY_MINVERSIONANDROID", "2.10.0",
        "BLOCKOUT_LEGACY_STOREURLIOS", "https://apps.apple.com/app/id123456789",
        "BLOCKOUT_LEGACY_STOREURLANDROID",
            "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout");
  }

  /**
   * Uses native environment binding, isolated from host credentials and system properties.
   *
   * @param environment scenario-owned inputs
   * @return an unstarted binding context
   */
  private static ApplicationContextRunner application(Map<String, Object> environment) {
    return new ApplicationContextRunner()
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
        .withUserConfiguration(BindingConfiguration.class);
  }

  /** Registers only the immutable retirement settings through Spring's standard binder. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(LegacyRetirementProperties.class)
  static class BindingConfiguration {}
}
