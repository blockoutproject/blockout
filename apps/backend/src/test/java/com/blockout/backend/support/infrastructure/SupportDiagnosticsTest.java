package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.backend.support.application.SupportUnavailableException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

/** Inspects the actual SLF4J event before encoding, including structured fields and throwable. */
@DisplayName("Support diagnostics privacy")
class SupportDiagnosticsTest {
  @Test
  @DisplayName(
      "Records only safe operational classification without provider cause or submitted content")
  void excludesPrivateFailureData() {
    // Given
    Logger logger = (Logger) LoggerFactory.getLogger(SupportDiagnostics.class);
    ListAppender<ILoggingEvent> events = new ListAppender<>();
    events.start();
    logger.addAppender(events);
    SupportUnavailableException failure =
        new SupportUnavailableException(
            SupportUnavailableException.Stage.ATTACH,
            SupportUnavailableException.Reason.PROCESS_FAILED,
            new IllegalStateException(
                "contact@example.invalid private-title private-body image.png token stdout stderr"));

    try {
      // When
      new SupportDiagnostics().failure(failure);

      // Then
      assertThat(events.list).hasSize(1);
      ILoggingEvent event = events.list.getFirst();
      assertThat(event.getThrowableProxy()).isNull();
      assertThat(event.getFormattedMessage()).isEqualTo("Support operation unavailable");
      assertThat(event.getKeyValuePairs())
          .extracting(value -> value.key)
          .containsExactly("operation", "stage", "outcome", "reason");
      assertThat(event.getKeyValuePairs())
          .extracting(value -> value.value.toString())
          .containsExactly("support_intake", "attach", "unavailable", "process_failed");
    } finally {
      logger.detachAppender(events);
      events.stop();
    }
  }
}
