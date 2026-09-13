package com.blockout.backend.worker.config;

import jakarta.validation.constraints.*;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("blockout.worker")
public record WorkerProperties(
    @Min(1) @Max(32) int concurrency,
    @NotNull @DurationMin(millis = 1) Duration poll,
    @NotNull @DurationMin(millis = 1) Duration lease,
    @NotNull @DurationMin(millis = 1) Duration renewal,
    @NotNull @DurationMin(millis = 1) Duration deadline,
    @NotNull @DurationMin(millis = 1) Duration shutdownGrace) {
  /** Renew before expiry and leave enough lease time for a graceful shutdown. */
  @AssertTrue(message = "Polling, renewal and shutdown grace must fit the lease")
  public boolean isLeaseTimingValid() {
    if (poll == null || lease == null || renewal == null || shutdownGrace == null) return true;
    return renewal.compareTo(lease) < 0
        && poll.compareTo(renewal) <= 0
        && shutdownGrace.compareTo(lease.minus(renewal)) <= 0;
  }
}
