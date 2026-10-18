package com.blockout.collector.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.collector.CollectorApplication;
import com.blockout.collector.generated.ingestion.ApiClient;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.bind.validation.BindValidationException;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/** Exercises actual Boot startup, configuration aliases and validation without provider calls. */
@DisplayName("Collector ingestion startup configuration")
class IngestionConfigurationSmokeTest {
  @ParameterizedTest
  @ValueSource(
      strings = {
        "--blockout.ingestion.audience=",
        "--blockout.ingestion.audience= ",
        "--blockout.ingestion.base-url=",
        "--blockout.ingestion.base-url=/relative",
        "--blockout.ingestion.base-url=ftp://api.example.invalid",
        "--blockout.ingestion.timeout=0s",
        "--blockout.ingestion.timeout=-1s",
        "--blockout.ingestion.timeout="
      })
  @DisplayName("Refuses invalid ingestion settings at startup")
  void rejectsInvalidSettings(String property) {
    // Given
    SpringApplicationBuilder application =
        new SpringApplicationBuilder(CollectorApplication.class).web(WebApplicationType.NONE);

    // When
    Throwable failure =
        catchThrowable(
            () -> {
              try (ConfigurableApplicationContext context =
                  application.run("--spring.main.keep-alive=false", property)) {
                // A successful startup is closed even when the expected rejection regresses.
              }
            });

    // Then
    assertThat(failure).hasRootCauseInstanceOf(BindValidationException.class);
  }

  @Test
  @DisplayName("Preserves the local backend URL and bounded default timeout")
  void preservesLocalDefaults() {
    // Given
    SpringApplicationBuilder application =
        new SpringApplicationBuilder(CollectorApplication.class).web(WebApplicationType.NONE);

    // When
    try (ConfigurableApplicationContext context =
        application.run("--spring.main.keep-alive=false")) {
      // Then
      IngestionProperties properties = context.getBean(IngestionProperties.class);
      assertThat(properties.timeout()).isEqualTo(Duration.ofSeconds(15));
      assertThat(context.getBean(ApiClient.class).getBasePath()).isEqualTo("http://localhost:8080");
    }
  }

  @Test
  @DisplayName("Binds the existing environment names to the ingestion client")
  void bindsExistingEnvironmentNames() {
    // Given
    StandardEnvironment environment = new StandardEnvironment();
    environment
        .getPropertySources()
        .addFirst(
            new SystemEnvironmentPropertySource(
                "testEnvironment",
                Map.of(
                    "BLOCKOUT_INGESTION_BASE_URL", "https://api.example.invalid",
                    "BLOCKOUT_INGESTION_AUDIENCE", "ingestion-preproduction",
                    "BLOCKOUT_INGESTION_TIMEOUT", "250ms")));
    SpringApplicationBuilder application =
        new SpringApplicationBuilder(CollectorApplication.class)
            .web(WebApplicationType.NONE)
            .environment(environment);

    // When
    try (ConfigurableApplicationContext context =
        application.run("--spring.main.keep-alive=false")) {
      // Then
      IngestionProperties properties = context.getBean(IngestionProperties.class);
      assertThat(properties.audience()).isEqualTo("ingestion-preproduction");
      assertThat(properties.timeout()).isEqualTo(Duration.ofMillis(250));
      assertThat(context.getBean(ApiClient.class).getBasePath())
          .isEqualTo("https://api.example.invalid");
    }
  }
}
