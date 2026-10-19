package com.blockout.collector.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.validation.BindValidationException;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/** Loads the shipped acquisition YAML through native binding, isolated from host configuration. */
@DisplayName("Collector acquisition configuration")
class AcquisitionPropertiesTest {
  private final ApplicationContextRunner application = application(Map.of());

  @Test
  @DisplayName("Starts with conservative shared provider limits and no document associations")
  void bindsDefaults() {
    // Given
    // The runner loads only the committed application YAML in a controlled environment.

    // When
    application.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          AcquisitionProperties properties = context.getBean(AcquisitionProperties.class);
          assertThat(properties.ffvbOrigins())
              .containsExactly("https://www.ffvb.org", "https://www.ffvbbeach.org");
          assertThat(properties.lnvOrigins())
              .containsExactly(
                  "https://www.lnv.fr",
                  "https://lnv-web.dataproject.com",
                  "https://images.dataproject.com");
          assertThat(properties.ignOrigins()).containsExactly("https://data.geopf.fr");
          assertThat(properties.timeout()).isEqualTo(Duration.ofSeconds(15));
          assertThat(properties.maxResponseBytes()).isEqualTo(8 * 1024 * 1024);
          assertThat(properties.maxRedirects()).isEqualTo(3);
          assertThat(properties.concurrencyPerProvider()).isEqualTo(2);
          assertThat(properties.queueCapacityPerProvider()).isEqualTo(8);
          assertThat(properties.permitsPerPeriod()).isEqualTo(1);
          assertThat(properties.refreshPeriod()).isEqualTo(Duration.ofSeconds(1));
          assertThat(properties.permitTimeout()).isEqualTo(Duration.ofSeconds(5));
          assertThat(properties.documentTeamAssociations()).isEmpty();
        });
  }

  @Test
  @DisplayName("Binds deployment environment overrides through native Spring configuration")
  void bindsEnvironmentOverrides() {
    // Given
    ApplicationContextRunner configured =
        application(
            Map.of(
                "BLOCKOUT_ACQUISITION_TIMEOUT", "250ms",
                "BLOCKOUT_ACQUISITION_CONCURRENCY", "1",
                "BLOCKOUT_ACQUISITION_FFVB_ORIGINS", "https://source.example.invalid"));

    // When
    configured.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          AcquisitionProperties properties = context.getBean(AcquisitionProperties.class);
          assertThat(properties.timeout()).isEqualTo(Duration.ofMillis(250));
          assertThat(properties.concurrencyPerProvider()).isEqualTo(1);
          assertThat(properties.ffvbOrigins()).containsExactly("https://source.example.invalid");
        });
  }

  @ParameterizedTest
  @CsvSource({
    "timeout=0s, timeout",
    "timeout=-1s, timeout",
    "timeout=, timeout",
    "max-response-bytes=0, maxResponseBytes",
    "max-redirects=-1, maxRedirects",
    "concurrency-per-provider=0, concurrencyPerProvider",
    "queue-capacity-per-provider=-1, queueCapacityPerProvider",
    "permits-per-period=0, permitsPerPeriod",
    "refresh-period=0s, refreshPeriod",
    "permit-timeout=-1s, permitTimeout",
    "ffvb-origins=, ffvbOrigins",
    "ffvb-origins=ftp://source.example.invalid, ffvbOrigins",
    "lnv-origins=https://source.example.invalid/path, lnvOrigins",
    "ign-origins=https://user@source.example.invalid, ignOrigins"
  })
  @DisplayName("Rejects invalid source boundaries or unbounded acquisition settings")
  void rejectsInvalidSettings(String setting, String field) {
    // Given
    ApplicationContextRunner configured =
        application.withPropertyValues("blockout.acquisition." + setting);

    // When
    configured.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
          assertThat(context.getStartupFailure())
              .hasRootCauseInstanceOf(BindValidationException.class)
              .hasStackTraceContaining(field);
        });
  }

  @Test
  @DisplayName("Allows immediate refusal without queueing, redirects or permit waiting")
  void allowsImmediateRefusal() {
    // Given
    ApplicationContextRunner configured =
        application.withPropertyValues(
            "blockout.acquisition.queue-capacity-per-provider=0",
            "blockout.acquisition.max-redirects=0",
            "blockout.acquisition.permit-timeout=0s");

    // When
    configured.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
        });
  }

  @Test
  @DisplayName("Keeps verified document labels scoped by season, championship and native team")
  void bindsScopedDocumentAssociations() {
    // Given
    ApplicationContextRunner configured =
        application.withPropertyValues(
            "blockout.acquisition.document-team-associations[0].season-start-year=2026",
            "blockout.acquisition.document-team-associations[0].championship-reference=championship-test",
            "blockout.acquisition.document-team-associations[0].native-team-reference=0042",
            "blockout.acquisition.document-team-associations[0].xml-team-label=Example team");

    // When
    configured.run(
        context -> {
          // Then
          assertThat(context).hasNotFailed();
          assertThat(context.getBean(AcquisitionProperties.class).documentTeamAssociations())
              .containsExactly(
                  new AcquisitionProperties.DocumentTeamAssociation(
                      2026, "championship-test", "0042", "Example team"));
        });
  }

  @Test
  @DisplayName("Rejects an unscoped document association")
  void rejectsUnscopedDocumentAssociation() {
    // Given
    ApplicationContextRunner configured =
        application.withPropertyValues(
            "blockout.acquisition.document-team-associations[0].season-start-year=2026",
            "blockout.acquisition.document-team-associations[0].native-team-reference=0042",
            "blockout.acquisition.document-team-associations[0].xml-team-label=Example team");

    // When
    configured.run(
        context -> {
          // Then
          assertThat(context).hasFailed();
          assertThat(context.getStartupFailure())
              .hasRootCauseInstanceOf(BindValidationException.class)
              .hasStackTraceContaining("championshipReference");
        });
  }

  /**
   * Prepares native binding against the shipped YAML without unrelated application components.
   *
   * @param environment scenario-owned variables replacing the host environment
   * @return an unstarted configuration context isolated from system properties and local files
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

  /** Enables only native binding and validation for the acquisition settings. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(AcquisitionProperties.class)
  static class BindingConfiguration {}
}
