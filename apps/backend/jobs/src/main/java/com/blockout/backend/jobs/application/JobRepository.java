package com.blockout.backend.jobs.application;

import java.time.Duration;
import java.util.Optional;

/**
 * Durable queue boundary. Leases use the database clock; every mutation fences the current attempt.
 */
public interface JobRepository {
  /**
   * Reserves one available job or recovers an expired lease in a short transaction. Competing
   * consumers skip locked rows. Each reservation creates a new token and consumes one attempt;
   * exhausted expired jobs become dead in bounded batches. The lease must be positive.
   */
  Optional<Job> claim(Duration lease);

  /**
   * Returns false for an expired, replaced or completed attempt, which cannot be renewed. Expiry is
   * evaluated after acquiring the row lock, including when acquisition had to wait.
   */
  boolean renew(Job job, Duration lease);

  /**
   * Locks and verifies the lease before running the callback, then commits SQL effects and success
   * together. The callback must use the configured datasource, perform no network I/O, and finish
   * within the transaction timeout. Callback failure propagates and rolls back both effects and
   * acknowledgement. Expiry before commit also rolls back both; false means no effect was
   * committed.
   */
  boolean completeWithEffect(Job job, Runnable effect);

  /**
   * Records a safe uppercase error code, releasing the lease for delayed retry or permanent dead
   * work. Exhausted attempts become dead regardless of the permanent flag. Returns false when this
   * attempt no longer owns a live lease. Delay must be nonnegative; errors never include payloads.
   */
  boolean fail(Job job, String code, Duration delay, boolean permanent);

  /**
   * Deletes at most 1,000 successes older than seven days, preserving pending, running and dead
   * work.
   */
  int cleanup();

  /** Counts a persisted state for bounded operational metrics. Database failures propagate. */
  double count(String state);

  /** Age of the oldest currently available pending job, or zero when none exist. */
  double oldestAvailableSeconds();
}
