package com.blockout.backend.worker.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class WorkerPropertiesTest {
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
