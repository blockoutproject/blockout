package com.blockout.collector.config;

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

/** Qualifies native collector output without a source acquisition or an HTTP listener. */
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest(
    classes = LoggingTest.LoggingConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
      "spring.main.banner-mode=off",
      "spring.main.log-startup-info=false",
      "spring.main.keep-alive=false"
    })
@DisplayName("Collector telemetry privacy")
class LoggingTest {
  private static final Logger LOG = LoggerFactory.getLogger(LoggingTest.class);

  @Test
  @DisplayName("Preserves a failed stage without credentials, payloads or personal references")
  void excludesSensitiveContext(CapturedOutput output) {
    // Given
    IllegalStateException failure =
        new IllegalStateException("harmless-secret", new RuntimeException("private-provider-body"));
    try (MDC.MDCCloseable ignored = MDC.putCloseable("email", "private@example.invalid")) {
      // When
      LOG.atError()
          .addKeyValue("operation", "source_read")
          .addKeyValue("stage", "acquisition")
          .addKeyValue("outcome", "failed")
          .addKeyValue("provider", "ffvb")
          .addKeyValue("authorization", "Bearer harmless-secret")
          .addKeyValue("payload", "private-provider-body")
          .addKeyValue("account_cleanup.original_account_id", "unapproved-personal-reference")
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
    assertThat(event.path("service").path("name").asText()).isEqualTo("blockout-collector");
    assertThat(event.path("operation").asText()).isEqualTo("source_read");
    assertThat(event.path("stage").asText()).isEqualTo("acquisition");
    assertThat(event.path("outcome").asText()).isEqualTo("failed");
    assertThat(event.path("provider").asText()).isEqualTo("ffvb");
    assertThat(event.path("error").path("type").asText())
        .isEqualTo(IllegalStateException.class.getName());
    assertThat(event.has("account_cleanup")).isFalse();
  }

  /** Supplies only a configuration source; no source adapter or generated client is initialized. */
  @Configuration(proxyBeanMethods = false)
  static class LoggingConfiguration {}
}
