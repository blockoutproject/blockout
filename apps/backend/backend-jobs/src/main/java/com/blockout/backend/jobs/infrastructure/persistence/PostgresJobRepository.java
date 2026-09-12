package com.blockout.backend.jobs.infrastructure.persistence;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobRepository;
import java.time.Duration;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL lease and acknowledgement operations; never holds a transaction over network I/O. */
public final class PostgresJobRepository implements JobRepository {
  private final JdbcTemplate sql;
  private final TransactionTemplate tx;

  public PostgresJobRepository(JdbcTemplate sql, TransactionTemplate tx) {
    this.sql = sql;
    this.tx = tx;
  }

  @Override
  public Optional<Job> claim(Duration lease) {
    return tx.execute(
        status -> {
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
                  (rs, n) ->
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

  @Override
  public boolean renew(Job job, Duration lease) {
    return sql.update(
            "UPDATE operations.jobs SET lease_expires_at=clock_timestamp()+(? * interval '1 millisecond') WHERE id=? AND state='running' AND lease_token=? AND lease_expires_at>clock_timestamp()",
            lease.toMillis(),
            job.id(),
            job.leaseToken())
        == 1;
  }

  @Override
  public boolean completeWithEffect(Job job, Runnable effect) {
    return Boolean.TRUE.equals(
        tx.execute(
            status -> {
              var rows =
                  sql.queryForList(
                      "SELECT id FROM operations.jobs WHERE id=? FOR UPDATE", job.id());
              if (rows.isEmpty()
                  || !Boolean.TRUE.equals(
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
            }));
  }

  @Override
  public boolean fail(Job job, String code, Duration delay, boolean permanent) {
    if (!code.matches("[A-Z][A-Z0-9_]{0,99}"))
      throw new IllegalArgumentException("Invalid safe error code");
    boolean dead = permanent || job.attempts() >= job.maxAttempts();
    return sql.update(
            """
            UPDATE operations.jobs
            SET state=?, available_at=clock_timestamp()+(? * interval '1 millisecond'),
                finished_at=CASE WHEN ? THEN clock_timestamp() ELSE NULL END,
                lease_token=NULL, lease_expires_at=NULL, last_error_code=?
            WHERE id=? AND state='running' AND lease_token=? AND lease_expires_at>clock_timestamp()
            """,
            dead ? "dead" : "pending",
            delay.toMillis(),
            dead,
            code,
            job.id(),
            job.leaseToken())
        == 1;
  }

  @Override
  public int cleanup() {
    return sql.update(
        "DELETE FROM operations.jobs WHERE id IN (SELECT id FROM operations.jobs WHERE state='succeeded' AND finished_at<clock_timestamp()-interval '7 days' LIMIT 1000 FOR UPDATE SKIP LOCKED)");
  }

  @Override
  public double count(String state) {
    return sql.queryForObject(
            "SELECT count(*) FROM operations.jobs WHERE state=?", Long.class, state)
        .doubleValue();
  }

  @Override
  public double oldestAvailableSeconds() {
    return sql.queryForObject(
        "SELECT coalesce(extract(epoch FROM clock_timestamp()-min(available_at)),0) FROM operations.jobs WHERE state='pending' AND available_at<=clock_timestamp()",
        Double.class);
  }
}
