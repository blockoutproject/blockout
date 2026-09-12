package com.blockout.backend.worker;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("blockout.worker")
public record WorkerProperties(
    int concurrency,
    Duration poll,
    Duration lease,
    Duration renewal,
    Duration deadline,
    Duration shutdownGrace) {
  public WorkerProperties {
    if (concurrency < 1 || concurrency > 32)
      throw new IllegalArgumentException("Worker concurrency must be between 1 and 32");
    for (Duration d : new Duration[] {poll, lease, renewal, deadline, shutdownGrace})
      if (d == null || d.isNegative() || d.toMillis() < 1)
        throw new IllegalArgumentException("Worker durations must be positive");
    if (renewal.compareTo(lease) >= 0
        || poll.compareTo(renewal) > 0
        || shutdownGrace.compareTo(lease.minus(renewal)) > 0)
      throw new IllegalArgumentException("Polling and renewal must fit the lease");
  }
}
