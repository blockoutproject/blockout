package com.blockout.backend.worker.config;

import jakarta.validation.constraints.*;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Startup-validated scheduler capacity and timing; field constraints own missing durations.
 *
 * @param concurrency maximum active executions, including cancelled handlers still exiting
 * @param poll delay between serialized control cycles
 * @param lease database-clock reservation duration
 * @param renewal interval between successful lease renewals
 * @param deadline maximum execution duration before interruption
 * @param shutdownGrace time allowed for handlers to finish before shutdown interruption
 */
@Validated
@ConfigurationProperties("blockout.worker")
public record WorkerProperties(
    @Min(1) @Max(32) int concurrency,
    @NotNull @DurationMin(millis = 1) Duration poll,
    @NotNull @DurationMin(millis = 1) Duration lease,
    @NotNull @DurationMin(millis = 1) Duration renewal,
    @NotNull @DurationMin(millis = 1) Duration deadline,
    @NotNull @DurationMin(millis = 1) Duration shutdownGrace) {
  /**
   * Checks polling, renewal and shutdown timing together; field constraints own missing durations.
   *
   * @return whether present durations fit inside the renewable lease window
   */
  @AssertTrue(message = "Polling, renewal and shutdown grace must fit the lease")
  public boolean isLeaseTimingValid() {
    if (poll == null || lease == null || renewal == null || shutdownGrace == null) return true;
    return renewal.compareTo(lease) < 0
        && poll.compareTo(renewal) <= 0
        && shutdownGrace.compareTo(lease.minus(renewal)) <= 0;
  }
}
