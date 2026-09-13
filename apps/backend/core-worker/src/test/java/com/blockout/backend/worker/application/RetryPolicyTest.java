package com.blockout.backend.worker.application;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

/** Checks the supported jitter interval without asserting a random sequence. */
class RetryPolicyTest {
  @Test
  void boundsRetryJitter() {
    for (int attempt = 1; attempt <= 5; attempt++) {
      long base = new long[] {5, 30, 120, 600, 600}[attempt - 1];
      for (int n = 0; n < 50; n++)
        assertThat(RetryPolicy.delay(attempt).toMillis()).isBetween(base * 800, base * 1200);
    }
  }
}
