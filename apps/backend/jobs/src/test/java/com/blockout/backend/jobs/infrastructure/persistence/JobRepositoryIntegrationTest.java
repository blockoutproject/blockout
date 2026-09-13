package com.blockout.backend.jobs.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.PublicationResult;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

/** Exercises real row locks, lease fencing, recovery and atomic effects. */
class JobRepositoryIntegrationTest extends PostgresJobsFixture {
  @Test
  void concurrentConsumersClaimDifferentJobs()
      throws InterruptedException, ExecutionException, TimeoutException {
    publish("a");
    publish("b");
    CyclicBarrier barrier = new CyclicBarrier(2);
    try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
      Callable<UUID> claim =
          () -> {
            barrier.await();
            return jobs.claim(Duration.ofSeconds(60)).orElseThrow().id();
          };
      Future<UUID> a = pool.submit(claim);
      Future<UUID> b = pool.submit(claim);
      assertThat(a.get(10, TimeUnit.SECONDS)).isNotEqualTo(b.get(10, TimeUnit.SECONDS));
    }
  }

  @Test
  void expiredReservationFencesTheFormerOwner() {
    publish("a");
    Job first = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    expire();
    Job next = jobs.claim(Duration.ofSeconds(60)).orElseThrow();

    assertThat(first.id()).isEqualTo(next.id());

    assertThat(first.leaseToken()).isNotEqualTo(next.leaseToken());

    assertThat(
            jobs.completeWithEffect(
                first,
                () -> {
                  throw new AssertionError("stale effect");
                }))
        .isFalse();

    assertThat(jobs.renew(first, Duration.ofSeconds(60))).isFalse();
    assertThat(jobs.fail(first, "STALE_FAILURE", Duration.ZERO, false)).isFalse();

    assertThat(jobs.completeWithEffect(next, () -> {})).isTrue();
  }

  @Test
  void effectFailureRollsBackAcknowledgement() {
    publish("a");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();

    assertThatThrownBy(
            () ->
                jobs.completeWithEffect(
                    job,
                    () -> {
                      sql.update("UPDATE operations.schema_metadata SET generation=5");
                      throw new IllegalStateException("failure");
                    }))
        .isInstanceOf(IllegalStateException.class);

    assertThat(
            sql.queryForObject("SELECT generation FROM operations.schema_metadata", Integer.class))
        .isEqualTo(4);

    assertThat(state()).isEqualTo("running");
  }

  @Test
  void expiredLastAttemptBecomesDead() {
    publish("a");
    jobs.claim(Duration.ofSeconds(60));
    sql.update("UPDATE operations.jobs SET attempts=max_attempts");
    expire();

    assertThat(jobs.claim(Duration.ofSeconds(60))).isEmpty();

    assertThat(state()).isEqualTo("dead");
  }

  @Test
  void retryWaitsUntilItsAvailability() {
    publish("a");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    jobs.fail(job, "TRANSIENT_FAILURE", Duration.ofSeconds(60), false);

    assertThat(jobs.claim(Duration.ofSeconds(60))).isEmpty();
    sql.update("UPDATE operations.jobs SET available_at=clock_timestamp()-interval '1 second'");

    assertThat(jobs.claim(Duration.ofSeconds(60))).isPresent();
  }

  @Test
  void permanentFailureIsNotRetried() {
    publish("a");
    jobs.fail(jobs.claim(Duration.ofSeconds(60)).orElseThrow(), "INVALID_JOB", Duration.ZERO, true);

    assertThat(state()).isEqualTo("dead");
  }

  @Test
  void externalEffectMayBeRepeatedAfterCrash() {
    publish("a");
    Job first = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    Set<UUID> remoteEffects = new HashSet<>();
    remoteEffects.add(first.id());
    expire();
    Job retry = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    remoteEffects.add(retry.id());
    jobs.completeWithEffect(retry, () -> {});

    assertThat(remoteEffects).hasSize(1);
  }

  @Test
  void cleanupRetainsDeadWork() {
    publish("a");
    jobs.completeWithEffect(jobs.claim(Duration.ofSeconds(60)).orElseThrow(), () -> {});
    sql.update("UPDATE operations.jobs SET finished_at=clock_timestamp()-interval '8 days'");
    publish("b");
    jobs.fail(jobs.claim(Duration.ofSeconds(60)).orElseThrow(), "INVALID_JOB", Duration.ZERO, true);

    assertThat(jobs.cleanup()).isEqualTo(1);

    assertThat(state()).isEqualTo("dead");
  }

  @Test
  void databaseSessionTimezoneDoesNotChangeLeaseDuration() {
    for (String zone : List.of("Pacific/Auckland", "America/Los_Angeles", "UTC")) {
      sql.execute("TRUNCATE operations.jobs");
      tx.executeWithoutResult(
          _ -> {
            sql.execute("SET LOCAL TIME ZONE '" + zone + "'");
            publisher.publish("test", 1, zone, Map.of());
            jobs.claim(Duration.ofSeconds(60)).orElseThrow();
            assertThat(
                    sql.queryForObject(
                        "SELECT extract(epoch FROM lease_expires_at-clock_timestamp()) FROM operations.jobs",
                        Double.class))
                .isBetween(55.0, 60.0);
          });
    }
  }

  @Test
  void runtimeRolesPublishAndConsumeWithoutOwnerCredentials() {
    JdbcTemplate apiSql =
        new JdbcTemplate(new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_api", "test"));
    TransactionTemplate apiTx =
        new TransactionTemplate(new JdbcTransactionManager(apiSql.getDataSource()));
    PostgresJobPublisher apiPublisher = new PostgresJobPublisher(apiSql, new JsonMapper());
    PublicationResult.Accepted result =
        (PublicationResult.Accepted)
            apiTx.execute(_ -> apiPublisher.publish("test", 1, "runtime", Map.of()));
    JdbcTemplate workerSql =
        new JdbcTemplate(new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_worker", "test"));
    TransactionTemplate workerTx =
        new TransactionTemplate(new JdbcTransactionManager(workerSql.getDataSource()));
    PostgresJobRepository workerJobs = new PostgresJobRepository(workerSql, workerTx);
    Job job = workerJobs.claim(Duration.ofSeconds(60)).orElseThrow();

    assertThat(job.id()).isEqualTo(result.id());

    assertThat(workerJobs.completeWithEffect(job, () -> {})).isTrue();
  }

  @org.junit.jupiter.params.ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"renew", "fail", "complete"})
  void waitingForARowLockCannotAuthorizeAnExpiredLease(String operation)
      throws java.sql.SQLException, InterruptedException, ExecutionException, TimeoutException {
    publish("locked");
    Job job = jobs.claim(Duration.ofSeconds(5)).orElseThrow();
    try (ExecutorService pool = Executors.newSingleThreadExecutor();
        Connection lock = sql.getDataSource().getConnection();
        Statement statement = lock.createStatement()) {
      lock.setAutoCommit(false);
      try {
        statement.executeQuery("SELECT id FROM operations.jobs FOR UPDATE").close();
        Future<Boolean> mutation =
            pool.submit(
                () ->
                    switch (operation) {
                      case "renew" -> jobs.renew(job, Duration.ofMinutes(1));
                      case "fail" -> jobs.fail(job, "TRANSIENT_FAILURE", Duration.ZERO, false);
                      case "complete" ->
                          jobs.completeWithEffect(
                              job,
                              () -> {
                                throw new AssertionError(
                                    "Expired attempt must not execute SQL effects");
                              });
                      default -> throw new IllegalArgumentException("Unknown test operation");
                    });
        // Observe PostgreSQL actually waiting, then release the unchanged row only after expiry.
        await()
            .atMost(Duration.ofSeconds(3))
            .until(
                () ->
                    sql.queryForObject(
                            "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
                            Integer.class)
                        > 0);
        await()
            .atMost(Duration.ofSeconds(6))
            .until(
                () ->
                    sql.queryForObject(
                        "SELECT lease_expires_at<=clock_timestamp() FROM operations.jobs",
                        Boolean.class));

        lock.rollback();

        assertThat(mutation.get(5, TimeUnit.SECONDS)).isFalse();
        assertThat(state()).isEqualTo("running");
        assertThat(jobs.claim(Duration.ofMinutes(1)).orElseThrow().leaseToken())
            .isNotEqualTo(job.leaseToken());
      } finally {
        lock.rollback();
      }
    }
  }
}
