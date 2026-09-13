package com.blockout.backend.jobs.application;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Durable queue boundary. Leases use the database clock; every mutation fences the current attempt.
 */
public interface JobRepository {
  /**
   * Reserves one available job or recovers an expired lease in a short transaction. Competing
   * consumers skip locked rows. Each reservation creates a new token and consumes one attempt;
   * exhausted expired jobs become dead in bounded batches. The lease must be positive.
   *
   * @param lease positive duration of the new database-clock lease
   * @return one claimed attempt, or empty when no eligible work is available
   */
  Optional<Job> claim(Duration lease);

  /**
   * Returns false for an expired, replaced or completed attempt, which cannot be renewed. Expiry is
   * evaluated after acquiring the row lock, including when acquisition had to wait.
   *
   * @param job attempt whose token must still own the row
   * @param lease positive replacement lease duration from the database clock
   * @return whether the live lease was extended
   */
  boolean renew(Job job, Duration lease);

  /**
   * Locks and verifies the lease before running the callback, then commits SQL effects and success
   * together. The callback must use the configured datasource, perform no network I/O, and finish
   * within the transaction timeout. Callback failure propagates and rolls back both effects and
   * acknowledgement. Expiry before commit also rolls back both; false means no effect was
   * committed.
   *
   * @param job claimed attempt to acknowledge
   * @param effect SQL-only callback using the job datasource
   * @return whether both the effect and acknowledgement committed
   */
  boolean completeWithEffect(Job job, Runnable effect);

  /**
   * Records a safe uppercase error code, releasing the lease for delayed retry or permanent dead
   * work. Exhausted attempts become dead regardless of the permanent flag. Returns false when this
   * attempt no longer owns a live lease. Delay must be nonnegative; errors never include payloads.
   *
   * @param job attempt being released
   * @param code safe uppercase diagnostic code, never provider prose
   * @param delay nonnegative wait before another attempt
   * @param permanent whether retry is forbidden regardless of remaining attempts
   * @return whether the owned live attempt transitioned
   * @throws IllegalArgumentException the error code does not match the safe-code format
   */
  boolean fail(Job job, String code, Duration delay, boolean permanent);

  /**
   * Deletes at most 1,000 successes older than seven days, preserving pending, running and dead
   * work.
   *
   * @return the number of old successful rows deleted
   */
  int cleanup();

  /**
   * Counts a persisted state for bounded operational metrics. Database failures propagate.
   *
   * @param state persisted queue state selected by the caller
   * @return number of matching rows, including zero
   */
  double count(JobState state);

  /**
   * Measures the oldest currently executable pending job using the database clock.
   *
   * @return age in seconds, or zero when no pending job is available
   */
  double oldestAvailableSeconds();

  /**
   * Reads queue state through its owner boundary without locking.
   *
   * @param id retained queue identity
   * @return current state, or empty after successful retention cleanup
   */
  Optional<JobState> state(UUID id);

  /**
   * Commits owner failure diagnostics and retry/dead transition under one live lease.
   *
   * @param job owned attempt
   * @param code safe diagnostic code
   * @param delay nonnegative retry delay
   * @param permanent whether retries stop
   * @param effect SQL-only callback on the same datasource
   * @return whether both writes committed; stale ownership executes no effect
   */
  boolean failWithEffect(Job job, String code, Duration delay, boolean permanent, Runnable effect);

  /**
   * Reads the terminal timestamp for an owner's bounded recovery policy.
   *
   * @param id queue identity
   * @return terminal time, absent while unfinished or after retention cleanup
   */
  Optional<Instant> finishedAt(UUID id);
}
