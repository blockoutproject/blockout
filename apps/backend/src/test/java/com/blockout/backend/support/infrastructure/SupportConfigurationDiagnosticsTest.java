package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.properties.ConfigurationPropertiesBindException;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Configuration;

/** Uses the shipped Boot diagnostics to prove rejected support settings cannot disclose secrets. */
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Support startup diagnostics privacy")
class SupportConfigurationDiagnosticsTest {
  @Test
  @DisplayName("Reports native configuration failure without rejected credential values")
  void excludesSecrets(CapturedOutput output) {
    // Given
    SpringApplication application = new SpringApplication(BindingConfiguration.class);
    application.setWebApplicationType(WebApplicationType.NONE);
    application.setLogStartupInfo(false);
    String[] arguments = {
      "--spring.config.location=classpath:/application.yaml",
      "--spring.main.banner-mode=off",
      "--blockout.support.destination.repository=fictional-org/private-support",
      "--blockout.support.destination.incomplete-label=intake-incomplete",
      "--blockout.support.destination.complete-label=intake-complete",
      "--blockout.support.destination.github-token=synthetic-sensitive-token",
      "--blockout.support.destination.discord-webhook=https://invalid.example/synthetic-private-webhook"
    };

    // When
    ThrowingCallable start = () -> application.run(arguments);

    // Then
    assertThatThrownBy(start).isInstanceOf(ConfigurationPropertiesBindException.class);
    assertThat(output.getAll())
        .doesNotContain("synthetic-sensitive-token", "synthetic-private-webhook", "fictional-org");
    assertThat(output.getAll()).contains("ERROR");
  }

  /** Registers native binding only; SpringApplication owns logging and failure analysis. */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(SupportProperties.class)
  static class BindingConfiguration {}
}
