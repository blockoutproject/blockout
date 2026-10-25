package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * Verifies real application YAML and native property validation without connecting to an engine.
 */
@DisplayName("OpenSearch startup settings")
class OpenSearchPropertiesTest {
  @ParameterizedTest
  @ValueSource(
      strings = {
        "BLOCKOUT_SEARCH_ENDPOINT",
        "BLOCKOUT_SEARCH_USERNAME",
        "BLOCKOUT_SEARCH_PASSWORD"
      })
  @DisplayName("Rejects missing required connection input")
  void rejectsMissingInput(String variable) {
    // Given
    Map<String, Object> environment = new HashMap<>(validEnvironment());
    environment.remove(variable);

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasFailed();
            });
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "http://localhost:9200",
        "https://user:secret@localhost:9200",
        "https://localhost:9200/path",
        " "
      })
  @DisplayName("Rejects plaintext and non-origin endpoints")
  void rejectsInvalidEndpoint(String endpoint) {
    // Given
    Map<String, Object> environment = new HashMap<>(validEnvironment());
    environment.put("BLOCKOUT_SEARCH_ENDPOINT", endpoint);

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasFailed();
            });
  }

  @Test
  @DisplayName("Binds safe native connection defaults")
  void bindsNativeSettings() {
    // Given
    Map<String, Object> environment = validEnvironment();

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasNotFailed();
              OpenSearchProperties settings = context.getBean(OpenSearchProperties.class);
              assertThat(settings.connectTimeoutMillis()).isEqualTo(3000);
              assertThat(settings.requestTimeoutMillis()).isEqualTo(5000);
              assertThat(settings.sslBundle()).isEqualTo("opensearch");
            });
  }

  @Test
  @DisplayName("Accepts an explicit request timeout override")
  void bindsTimeoutOverride() {
    // Given
    ApplicationContextRunner application =
        application(validEnvironment())
            .withPropertyValues("blockout.search.request-timeout-millis=1250");

    // When
    application.run(
        context -> {
          // Then
          assertThat(context.getBean(OpenSearchProperties.class).requestTimeoutMillis())
              .isEqualTo(1250);
        });
  }

  @Test
  @DisplayName("Rejects an unbounded zero request timeout")
  void rejectsZeroTimeout() {
    // Given
    ApplicationContextRunner application =
        application(validEnvironment())
            .withPropertyValues("blockout.search.request-timeout-millis=0");

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
        });
  }

  @Test
  @DisplayName("Uses the local alias namespace from the actual application YAML")
  void bindsIndexNamespace() {
    // Given
    ApplicationContextRunner application = application(validEnvironment());

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          assertThat(context.getBean(SearchIndexProperties.class).prefix())
              .isEqualTo("blockout-local-search");
        });
  }

  @Test
  @DisplayName("Accepts an explicit environment-owned alias namespace")
  void bindsIndexOverride() {
    // Given
    Map<String, Object> environment = new HashMap<>(validEnvironment());
    environment.put("BLOCKOUT_SEARCH_INDEX_PREFIX", "blockout-synthetic-search");

    // When
    application(environment)
        .run(
            context -> {
              // Then
              assertThat(context).hasNotFailed();
              assertThat(context.getBean(SearchIndexProperties.class).prefix())
                  .isEqualTo("blockout-synthetic-search");
            });
  }

  @ParameterizedTest
  @ValueSource(strings = {" ", "indexes,*", "UPPER"})
  @DisplayName("Rejects blank and multi-index namespace shapes")
  void rejectsInvalidNamespace(String prefix) {
    // Given
    ApplicationContextRunner application =
        application(validEnvironment())
            .withPropertyValues("blockout.search.indexes.prefix=" + prefix);

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
        });
  }

  /** Returns synthetic inputs only; no real credential is read from the host environment. */
  private static Map<String, Object> validEnvironment() {
    return Map.of(
        "BLOCKOUT_SEARCH_ENDPOINT",
        "https://localhost:9200",
        "BLOCKOUT_SEARCH_USERNAME",
        "synthetic",
        "BLOCKOUT_SEARCH_PASSWORD",
        "synthetic");
  }

  /**
   * Loads the shipped YAML with isolated environment aliases and native validation.
   *
   * @param environment scenario-owned values
   * @return unstarted property-binding context
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
        .withUserConfiguration(Binding.class);
  }

  /**
   * Activates only typed property binding so tests do not require networking or production secrets.
   */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties({OpenSearchProperties.class, SearchIndexProperties.class})
  static class Binding {}
}
