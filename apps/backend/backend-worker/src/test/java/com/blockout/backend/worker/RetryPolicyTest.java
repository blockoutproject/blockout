package com.blockout.backend.worker;

import static org.assertj.core.api.Assertions.*;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RetryPolicyTest {
  @Test
  void boundsRetryJitter() {
    for (int attempt = 1; attempt <= 5; attempt++) {
      long base = new long[] {5, 30, 120, 600, 600}[attempt - 1];
      for (int n = 0; n < 50; n++)
        assertThat(RetryPolicy.delay(attempt).toMillis()).isBetween(base * 800, base * 1200);
    }
  }

  @Test
  void rejectsRenewalBeyondLease() {
    assertThatThrownBy(
            () ->
                new WorkerProperties(
                    2,
                    Duration.ofSeconds(1),
                    Duration.ofSeconds(10),
                    Duration.ofSeconds(20),
                    Duration.ofMinutes(2),
                    Duration.ofSeconds(30)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
