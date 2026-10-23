package com.blockout.backend.access.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Exercises resource cleanup with a real delegated process, without Spring or PostgreSQL. */
@DisplayName("Settings consumer process lifetime")
class AccessSettingsConsumerProcessTest {
  @Test
  @DisplayName("Stops the consumer's delegated child after a timeout")
  void stopsDelegatedChildAfterTimeout() throws Exception {
    // Given
    Process consumer = new ProcessBuilder("sh", "-c", "sleep 300 & echo $!; wait").start();
    ProcessHandle child =
        ProcessHandle.of(Long.parseLong(consumer.inputReader().readLine())).orElseThrow();
    try {
      // When
      boolean finished = AccessSettingsConsumerProcess.waitFor(consumer, Duration.ZERO);

      // Then
      assertThat(finished).isFalse();
      assertThat(child.isAlive()).isFalse();
      assertThat(consumer.isAlive()).isFalse();
    } finally {
      child.destroyForcibly();
      consumer.destroyForcibly();
      consumer.waitFor(5, TimeUnit.SECONDS);
    }
  }

  @Test
  @DisplayName("Stops the consumer's delegated child when its caller is interrupted")
  void stopsDelegatedChildAfterInterruption() throws Exception {
    // Given
    Process consumer = new ProcessBuilder("sh", "-c", "sleep 300 & echo $!; wait").start();
    ProcessHandle child =
        ProcessHandle.of(Long.parseLong(consumer.inputReader().readLine())).orElseThrow();
    try {
      Thread.currentThread().interrupt();

      // When
      org.assertj.core.api.ThrowableAssert.ThrowingCallable wait =
          () -> AccessSettingsConsumerProcess.waitFor(consumer, Duration.ofSeconds(90));

      // Then
      assertThatThrownBy(wait).isInstanceOf(InterruptedException.class);
      assertThat(child.isAlive()).isFalse();
      assertThat(consumer.isAlive()).isFalse();
    } finally {
      Thread.interrupted();
      child.destroyForcibly();
      consumer.destroyForcibly();
      consumer.waitFor(5, TimeUnit.SECONDS);
    }
  }
}
