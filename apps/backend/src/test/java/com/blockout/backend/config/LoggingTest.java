package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Exercises the application's native console encoder without starting HTTP or persistence. */
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest(
    classes = LoggingTest.LoggingConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
      "spring.main.banner-mode=off",
      "spring.main.log-startup-info=false",
      "spring.main.keep-alive=false"
    })
@DisplayName("Backend telemetry privacy")
class LoggingTest {
  private static final Logger LOG = LoggerFactory.getLogger(LoggingTest.class);

  @Test
  @DisplayName("Keeps technical failure context while rejecting free-form sensitive data")
  void excludesSensitiveContext(CapturedOutput output) {
    // Given
    IllegalStateException failure =
        new IllegalStateException("harmless-secret", new RuntimeException("private-provider-body"));
    try (MDC.MDCCloseable ignored = MDC.putCloseable("email", "private@example.invalid")) {
      // When
      LOG.atError()
          .addKeyValue("operation", "http_request")
          .addKeyValue("outcome", "failed")
          .addKeyValue("authorization", "Bearer harmless-secret")
          .addKeyValue("payload", "private-provider-body")
          .addKeyValue("original_account_id", "unapproved-personal-reference")
          .setCause(failure)
          .log("https://example.invalid/private?token=harmless-secret");
    }

    // Then
    assertThat(output.getAll())
        .doesNotContain(
            "harmless-secret",
            "private-provider-body",
            "private@example.invalid",
            "unapproved-personal-reference",
            "example.invalid/private");
    JsonNode event = JsonMapper.builder().build().readTree(output.getOut().strip());
    assertThat(event.path("service").path("name").asText()).isEqualTo("blockout-backend");
    assertThat(event.path("log").path("level").asText()).isEqualTo("ERROR");
    assertThat(event.path("operation").asText()).isEqualTo("http_request");
    assertThat(event.path("outcome").asText()).isEqualTo("failed");
    assertThat(event.path("error").path("type").asText())
        .isEqualTo(IllegalStateException.class.getName());
    assertThat(event.has("message")).isFalse();
    assertThat(event.path("error").has("stack_trace")).isFalse();
  }

  @Test
  @DisplayName("Retains only the approved original-target references for private account cleanup")
  void preservesPrivateCleanupTargets(CapturedOutput output) {
    // Given
    String originalAccountId = "00000000-0000-4000-8000-000000000001";

    // When
    LOG.atWarn()
        .addKeyValue("operation", "account_cleanup")
        .addKeyValue("outcome", "uncertain")
        .addKeyValue("provider", "auth0")
        .addKeyValue("account_cleanup.original_account_id", originalAccountId)
        .addKeyValue("account_cleanup.auth0_subject", "auth0|harmless-original")
        .addKeyValue("account_cleanup.revenuecat_app_user_id", "harmless-original")
        .addKeyValue("account_cleanup.email", "private@example.invalid")
        .addKeyValue("account_cleanup.token", "harmless-secret")
        .log("Private cleanup requires manual verification");

    // Then
    assertThat(output.getAll()).doesNotContain("private@example.invalid", "harmless-secret");
    JsonNode event = JsonMapper.builder().build().readTree(output.getOut().strip());
    assertThat(event.path("operation").asText()).isEqualTo("account_cleanup");
    assertThat(event.path("outcome").asText()).isEqualTo("uncertain");
    assertThat(event.path("account_cleanup").path("original_account_id").asText())
        .isEqualTo(originalAccountId);
    assertThat(event.path("account_cleanup").path("auth0_subject").asText())
        .isEqualTo("auth0|harmless-original");
    assertThat(event.path("account_cleanup").path("revenuecat_app_user_id").asText())
        .isEqualTo("harmless-original");
  }

  /** Supplies only a configuration source; Boot itself owns logging initialization. */
  @Configuration(proxyBeanMethods = false)
  static class LoggingConfiguration {}
}
