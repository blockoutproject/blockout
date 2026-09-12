package com.blockout.backend.worker.application;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

final class RetryPolicy {
  private RetryPolicy() {}

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
