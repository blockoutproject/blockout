package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.backend.accounts.application.AccountCleanup.Outcome;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

/** Synthetic private-target diagnostics; these fixtures contain no real principal or credential. */
@DisplayName("Private erasure diagnostic safety")
class ErasureDiagnosticsTest {
  @Test
  @DisplayName("Retains only original references and safe failure context without raw exceptions")
  void recordsMinimalPrivateReference() {
    // Given
    Logger logger = (Logger) LoggerFactory.getLogger(OriginalTargetCleanup.class);
    ListAppender<ILoggingEvent> events = new ListAppender<>();
    events.start();
    logger.addAppender(events);
    UUID original = UUID.fromString("00000000-0000-4000-8000-000000000280");
    OriginalTargetCleanup cleanup =
        new OriginalTargetCleanup(
            (issuer, subject) -> {
              throw new IllegalArgumentException(
                  "email@example.invalid token-secret raw-payload photo-bytes");
            },
            customer -> Outcome.QUEUED,
            "preproduction");
    try {
      // When
      cleanup.clean(
          new OriginalAccountTargets(
              original,
              "https://identity.example.invalid/",
              "auth0|synthetic",
              List.of(original.toString())));

      // Then
      assertThat(events.list).hasSize(1);
      ILoggingEvent event = events.list.getFirst();
      assertThat(event.getThrowableProxy()).isNull();
      assertThat(event.getFormattedMessage())
          .doesNotContain("email@", "token-secret", "raw-payload", "photo-bytes");
      assertThat(event.getKeyValuePairs().toString())
          .contains(
              "auth0|synthetic", original.toString(), "unavailable_or_uncertain", "preproduction")
          .doesNotContain("email@", "token-secret", "raw-payload", "photo-bytes");
    } finally {
      logger.detachAppender(events);
      events.stop();
    }
  }
}
