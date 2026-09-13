package com.blockout.backend.jobs.infrastructure.persistence;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobRepository;
import com.blockout.backend.jobs.application.JobState;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL lease and acknowledgement operations; never holds a transaction over network I/O. */
public final class PostgresJobRepository implements JobRepository {
  private final JdbcTemplate sql;
  private final TransactionTemplate tx;

  /**
   * Binds the adapter to its application-owned collaborators.
   *
   * @param sql queue datasource access
   * @param tx short transactions using that same datasource
   */
  public PostgresJobRepository(JdbcTemplate sql, TransactionTemplate tx) {
    this.sql = sql;
    this.tx = tx;
  }

  /** {@inheritDoc} */
  @Override
  public Optional<Job> claim(Duration lease) {
    return tx.execute(
        _ -> {
          sql.update(
              """
              UPDATE operations.jobs
              SET state='dead', finished_at=clock_timestamp(), lease_token=NULL,
                  lease_expires_at=NULL, last_error_code='ATTEMPTS_EXHAUSTED'
              WHERE id IN (
                SELECT id FROM operations.jobs
                WHERE state='running' AND lease_expires_at<=clock_timestamp()
                  AND attempts>=max_attempts
                LIMIT 100 FOR UPDATE SKIP LOCKED
              )
              """);
          return sql
              .query(
                  """
                  WITH candidate AS (
                    SELECT id FROM operations.jobs
                    WHERE attempts<max_attempts AND (
                      (state='pending' AND available_at<=clock_timestamp()) OR
                      (state='running' AND lease_expires_at<=clock_timestamp())
                    )
                    ORDER BY available_at,created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
                  )
                  UPDATE operations.jobs j
                  SET state='running', attempts=attempts+1, lease_token=?,
                      lease_expires_at=clock_timestamp()+(? * interval '1 millisecond')
                  FROM candidate c WHERE j.id=c.id RETURNING j.*
                  """,
                  (rs, _) ->
                      new Job(
                          rs.getObject("id", UUID.class),
                          rs.getString("job_type"),
                          rs.getInt("payload_version"),
                          rs.getString("payload"),
                          rs.getObject("lease_token", UUID.class),
                          rs.getInt("attempts"),
                          rs.getInt("max_attempts")),
                  UUID.randomUUID(),
                  lease.toMillis())
              .stream()
              .findFirst();
        });
  }

  /** {@inheritDoc} */
  @Override
  public boolean renew(Job job, Duration lease) {
    return withLockedAttempt(
        job,
        _ ->
            sql.update(
                    "UPDATE operations.jobs SET lease_expires_at=clock_timestamp()+(? * interval '1 millisecond') WHERE id=? AND state='running' AND lease_token=? AND lease_expires_at>clock_timestamp()",
                    lease.toMillis(),
                    job.id(),
                    job.leaseToken())
                == 1);
  }

  /** {@inheritDoc} */
  @Override
  public boolean completeWithEffect(Job job, Runnable effect) {
    return withLockedAttempt(
        job,
        status -> {
          if (!Boolean.TRUE.equals(
              sql.queryForObject(
                  "SELECT state='running' AND lease_token=? AND lease_expires_at>clock_timestamp() FROM operations.jobs WHERE id=?",
                  Boolean.class,
                  job.leaseToken(),
                  job.id()))) return false;
          effect.run();
          int updated =
              sql.update(
                  "UPDATE operations.jobs SET state='succeeded',finished_at=clock_timestamp(),lease_token=NULL,lease_expires_at=NULL,last_error_code=NULL WHERE id=? AND lease_token=? AND lease_expires_at>clock_timestamp()",
                  job.id(),
                  job.leaseToken());
          if (updated != 1) {
            status.setRollbackOnly();
            return false;
          }
          return true;
        });
  }

  /** {@inheritDoc} */
  @Override
  public boolean fail(Job job, String code, Duration delay, boolean permanent) {
    return failWithEffect(job, code, delay, permanent, () -> {});
  }

  /** {@inheritDoc} */
  @Override
  public Optional<JobState> state(UUID id) {
    return sql
        .query(
            "SELECT state FROM operations.jobs WHERE id=?",
            (row, index) -> JobState.valueOf(row.getString(1).toUpperCase(Locale.ROOT)),
            id)
        .stream()
        .findFirst();
  }

  /** {@inheritDoc} */
  @Override
  public boolean failWithEffect(
      Job job, String code, Duration delay, boolean permanent, Runnable effect) {
    if (!code.matches("[A-Z][A-Z0-9_]{0,99}"))
      throw new IllegalArgumentException("Invalid safe error code");
    if (delay.isNegative()) throw new IllegalArgumentException("Negative retry delay");
    boolean dead = permanent || job.attempts() >= job.maxAttempts();
    return withLockedAttempt(
        job,
        status -> {
          if (!Boolean.TRUE.equals(
              sql.queryForObject(
                  "SELECT lease_expires_at>clock_timestamp() FROM operations.jobs WHERE id=?",
                  Boolean.class,
                  job.id()))) return false;
          effect.run();
          int updated =
              sql.update(
                  """
          UPDATE operations.jobs SET state=?, available_at=clock_timestamp()+(? * interval '1 millisecond'),
          finished_at=CASE WHEN ? THEN clock_timestamp() ELSE NULL END,
          lease_token=NULL, lease_expires_at=NULL, last_error_code=?
          WHERE id=? AND state='running' AND lease_token=? AND lease_expires_at>clock_timestamp()
          """,
                  dead ? "dead" : "pending",
                  delay.toMillis(),
                  dead,
                  code,
                  job.id(),
                  job.leaseToken());
          if (updated != 1) status.setRollbackOnly();
          return updated == 1;
        });
  }

  /**
   * PostgreSQL can evaluate a volatile UPDATE predicate before waiting for an unchanged locked row.
   * Acquire the attempt's lock first, then evaluate expiry in a separate statement in the same
   * transaction. Otherwise a wait could revive an already expired lease.
   *
   * @param job attempt whose row must still have the same token
   * @param mutation expiry-aware mutation executed after the row lock is acquired
   * @return false when ownership is absent; otherwise the mutation result
   */
  private boolean withLockedAttempt(Job job, TransactionCallback<Boolean> mutation) {
    return Boolean.TRUE.equals(
        tx.execute(
            status -> {
              var rows =
                  sql.queryForList(
                      "SELECT id FROM operations.jobs WHERE id=? AND state='running' AND lease_token=? FOR UPDATE",
                      job.id(),
                      job.leaseToken());
              if (rows.isEmpty()) return false;
              return mutation.doInTransaction(status);
            }));
  }

  /** {@inheritDoc} */
  @Override
  public int cleanup() {
    return sql.update(
        "DELETE FROM operations.jobs WHERE id IN (SELECT id FROM operations.jobs WHERE state='succeeded' AND finished_at<clock_timestamp()-interval '7 days' LIMIT 1000 FOR UPDATE SKIP LOCKED)");
  }

  /** {@inheritDoc} */
  @Override
  public double count(String state) {
    return sql.queryForObject(
            "SELECT count(*) FROM operations.jobs WHERE state=?", Long.class, state)
        .doubleValue();
  }

  /** {@inheritDoc} */
  @Override
  public double oldestAvailableSeconds() {
    return sql.queryForObject(
        "SELECT coalesce(extract(epoch FROM clock_timestamp()-min(available_at)),0) FROM operations.jobs WHERE state='pending' AND available_at<=clock_timestamp()",
        Double.class);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<Instant> finishedAt(UUID id) {
    return sql
        .query(
            "SELECT finished_at FROM operations.jobs WHERE id=? AND finished_at IS NOT NULL",
            (row, index) -> row.getTimestamp(1).toInstant(),
            id)
        .stream()
        .findFirst();
  }
}
