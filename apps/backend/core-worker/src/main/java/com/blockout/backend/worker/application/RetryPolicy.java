package com.blockout.backend.worker.application;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

/** Schedules bounded handler retries with twenty-percent jitter to spread competing attempts. */
final class RetryPolicy {
  /** Prevents instances of the worker retry policy. */
  private RetryPolicy() {}

  /**
   * Applies jitter around the five, thirty, one-hundred-twenty or six-hundred-second retry stage.
   *
   * @param attempt one-based attempt just completed
   * @return a randomized duration within twenty percent of the selected stage
   */
  static Duration delay(int attempt) {
    long seconds =
        switch (attempt) {
          case 1 -> 5;
          case 2 -> 30;
          case 3 -> 120;
          default -> 600;
        };
    return Duration.ofMillis(
        ThreadLocalRandom.current().nextLong(seconds * 800, seconds * 1200 + 1));
  }
}
