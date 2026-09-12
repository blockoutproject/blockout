package com.blockout.backend.jobs;

import static org.assertj.core.api.Assertions.*;

import java.sql.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

@Testcontainers
class JobRepositoryIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static JdbcTemplate sql;
  static TransactionTemplate tx;
  static JobRepository jobs;
  static JobPublisher publisher;

  @BeforeAll
  static void setup() throws Exception {
    var ds = new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    sql = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new JdbcTransactionManager(ds));
    try (var c = ds.getConnection()) {
      c.createStatement()
          .execute(
              "CREATE SCHEMA operations; CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'; GRANT USAGE ON SCHEMA operations TO blockout_api, blockout_worker");
      try (var lb =
          new Liquibase(
              "db/changelog/db.changelog-master.xml",
              new ClassLoaderResourceAccessor(),
              new JdbcConnection(c))) {
        lb.update("");
      }
    }
    jobs = new JobRepository(sql, tx);
    publisher = new JobPublisher(sql, new JsonMapper());
  }

  @BeforeEach
  void clean() {
    sql.execute("TRUNCATE operations.jobs");
  }

  UUID publish(String key) {
    return tx.execute(s -> publisher.publish("test", 1, key, Map.of("value", 1)));
  }

  @Test
  void requiresAnOwnerTransaction() {
    assertThatThrownBy(() -> publisher.publish("test", 1, "a", Map.of()))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void rollsBackPublicationWithOwner() {
    tx.executeWithoutResult(
        s -> {
          publisher.publish("test", 1, "a", Map.of());
          s.setRollbackOnly();
        });
    assertThat(count()).isZero();
  }

  @Test
  void deduplicatesCanonicalContent() {
    UUID a = tx.execute(s -> publisher.publish("test", 1, "a", Map.of("a", 1, "b", 2)));
    UUID b =
        tx.execute(
            s -> publisher.publish("test", 1, "a", new LinkedHashMap<>(Map.of("b", 2, "a", 1))));
    assertThat(b).isEqualTo(a);
    assertThat(count()).isEqualTo(1);
    assertThatThrownBy(() -> tx.execute(s -> publisher.publish("test", 1, "a", Map.of("a", 3))))
        .isInstanceOf(JobConflictException.class);
  }

  @Test
  void rejectsOversizedPayload() {
    assertThatThrownBy(
            () ->
                tx.execute(
                    s -> publisher.publish("test", 1, "a", Map.of("text", "x".repeat(65536)))))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void concurrentConsumersClaimDifferentJobs() throws Exception {
    publish("a");
    publish("b");
    var barrier = new CyclicBarrier(2);
    try (var pool = Executors.newFixedThreadPool(2)) {
      Callable<UUID> claim =
          () -> {
            barrier.await();
            return jobs.claim(Duration.ofSeconds(60)).orElseThrow().id();
          };
      var a = pool.submit(claim);
      var b = pool.submit(claim);
      assertThat(a.get(10, TimeUnit.SECONDS)).isNotEqualTo(b.get(10, TimeUnit.SECONDS));
    }
  }

  @Test
  void expiredReservationFencesTheFormerOwner() {
    publish("a");
    var first = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    expire();
    var next = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
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
    assertThat(jobs.completeWithEffect(next, () -> {})).isTrue();
  }

  @Test
  void effectFailureRollsBackAcknowledgement() {
    publish("a");
    var job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    assertThatThrownBy(
            () ->
                jobs.completeWithEffect(
                    job,
                    () -> {
                      sql.update("UPDATE operations.schema_metadata SET generation=2");
                      throw new IllegalStateException("failure");
                    }))
        .isInstanceOf(IllegalStateException.class);
    assertThat(
            sql.queryForObject("SELECT generation FROM operations.schema_metadata", Integer.class))
        .isEqualTo(1);
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
    var job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
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
    var first = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    Set<UUID> remoteEffects = new HashSet<>();
    remoteEffects.add(first.id());
    expire();
    var retry = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
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
  void concurrentPublishersReuseOneIdentity() throws Exception {
    var barrier = new CyclicBarrier(2);
    try (var pool = Executors.newFixedThreadPool(2)) {
      Callable<UUID> publish =
          () -> {
            barrier.await();
            return publish("same");
          };
      var first = pool.submit(publish);
      var second = pool.submit(publish);
      assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
      assertThat(count()).isEqualTo(1);
    }
  }

  @Test
  void databaseSessionTimezoneDoesNotChangeLeaseDuration() {
    for (String zone : List.of("Pacific/Auckland", "America/Los_Angeles", "UTC")) {
      sql.execute("TRUNCATE operations.jobs");
      tx.executeWithoutResult(
          status -> {
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
  void missingOrIncompatibleSchemaIsNotReady() {
    var health = new SchemaHealthIndicator(sql);
    assertThat(health.health().getStatus().getCode()).isEqualTo("UP");
    sql.update("UPDATE operations.schema_metadata SET generation=2");
    try {
      assertThat(health.health().getStatus().getCode()).isEqualTo("DOWN");
    } finally {
      sql.update("UPDATE operations.schema_metadata SET generation=1");
    }
    tx.executeWithoutResult(
        status -> {
          sql.execute("DROP TABLE operations.jobs");
          assertThat(health.health().getStatus().getCode()).isEqualTo("DOWN");
          status.setRollbackOnly();
        });
  }

  @Test
  void runtimeRolesPublishAndConsumeWithoutOwnerCredentials() {
    var apiSql =
        new JdbcTemplate(new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_api", "test"));
    var apiTx = new TransactionTemplate(new JdbcTransactionManager(apiSql.getDataSource()));
    var apiPublisher = new JobPublisher(apiSql, new JsonMapper());
    UUID id = apiTx.execute(status -> apiPublisher.publish("test", 1, "runtime", Map.of()));
    var workerSql =
        new JdbcTemplate(new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_worker", "test"));
    var workerTx = new TransactionTemplate(new JdbcTransactionManager(workerSql.getDataSource()));
    var workerJobs = new JobRepository(workerSql, workerTx);
    var job = workerJobs.claim(Duration.ofSeconds(60)).orElseThrow();
    assertThat(job.id()).isEqualTo(id);
    assertThat(workerJobs.completeWithEffect(job, () -> {})).isTrue();
  }

  void expire() {
    sql.update("UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second'");
  }

  String state() {
    return sql.queryForObject("SELECT state FROM operations.jobs", String.class);
  }

  int count() {
    return sql.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class);
  }
}
