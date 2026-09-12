package com.blockout.backend.worker;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

import com.blockout.backend.jobs.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
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
class WorkerIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static JdbcTemplate sql;
  static TransactionTemplate tx;
  static JobRepository repository;
  static JobPublisher publisher;
  JobWorker worker;

  @BeforeAll
  static void setup() throws Exception {
    var ds = new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    sql = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new JdbcTransactionManager(ds));
    try (var c = ds.getConnection()) {
      c.createStatement()
          .execute(
              "CREATE SCHEMA operations; CREATE ROLE blockout_api; CREATE ROLE blockout_worker");
      try (var lb =
          new Liquibase(
              "db/changelog/db.changelog-master.xml",
              new ClassLoaderResourceAccessor(),
              new JdbcConnection(c))) {
        lb.update("");
      }
    }
    repository = new JobRepository(sql, tx);
    publisher = new JobPublisher(sql, new JsonMapper());
  }

  @BeforeEach
  void clean() {
    sql.execute("TRUNCATE operations.jobs");
  }

  @AfterEach
  void stop() {
    if (worker != null) worker.stop();
  }

  void start(JobHandler handler) {
    worker =
        new JobWorker(
            repository,
            new WorkerProperties(
                2,
                Duration.ofMillis(25),
                Duration.ofMillis(500),
                Duration.ofMillis(100),
                Duration.ofSeconds(2),
                Duration.ofMillis(200)),
            handler == null ? List.of() : List.of(handler),
            new SimpleMeterRegistry(),
            new SchemaHealthIndicator(sql));
    worker.start();
  }

  void publish(String key) {
    tx.executeWithoutResult(s -> publisher.publish("test", 1, key, Map.of()));
  }

  @Test
  void processesSupportedWork() {
    var executions = new AtomicInteger();
    publish("a");
    start(handler(j -> executions.incrementAndGet()));
    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count("succeeded")).isEqualTo(1));
    assertThat(executions).hasValue(1);
  }

  @Test
  void boundsConcurrencyAndRenewsLeases() throws Exception {
    for (int i = 0; i < 5; i++) publish("" + i);
    var entered = new CountDownLatch(2);
    var release = new CountDownLatch(1);
    var active = new AtomicInteger();
    var peak = new AtomicInteger();
    start(
        handler(
            j -> {
              int n = active.incrementAndGet();
              peak.accumulateAndGet(n, Math::max);
              entered.countDown();
              release.await();
              active.decrementAndGet();
            }));
    assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
    var initial =
        sql.queryForObject(
            "SELECT max(lease_expires_at) FROM operations.jobs", java.sql.Timestamp.class);
    await()
        .atMost(Duration.ofSeconds(1))
        .untilAsserted(
            () ->
                assertThat(
                        sql.queryForObject(
                            "SELECT max(lease_expires_at) FROM operations.jobs",
                            java.sql.Timestamp.class))
                    .isAfter(initial));
    assertThat(repository.count("running")).isEqualTo(2);
    release.countDown();
    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count("succeeded")).isEqualTo(5));
    assertThat(peak.get()).isLessThanOrEqualTo(2);
  }

  @Test
  void unknownTypesBecomeDead() {
    publish("a");
    start(null);
    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count("dead")).isEqualTo(1));
  }

  @Test
  void failedHandlerSchedulesRetry() {
    publish("a");
    start(
        handler(
            j -> {
              throw new IllegalStateException("test failure");
            }));
    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(
            () ->
                assertThat(
                        sql.queryForObject(
                            "SELECT last_error_code FROM operations.jobs", String.class))
                    .isEqualTo("HANDLER_FAILURE"));
    assertThat(repository.count("pending")).isEqualTo(1);
  }

  @Test
  void incompatibleSchemaPreventsConsumption() {
    sql.update("UPDATE operations.schema_metadata SET generation=2");
    try {
      publish("a");
      start(
          handler(
              j -> {
                throw new AssertionError("must not execute");
              }));
      worker.tick();
      assertThat(repository.count("pending")).isEqualTo(1);
    } finally {
      sql.update("UPDATE operations.schema_metadata SET generation=1");
    }
  }

  @Test
  void shutdownLeavesInterruptedWorkRecoverable() throws Exception {
    var entered = new CountDownLatch(1);
    publish("a");
    start(
        handler(
            j -> {
              entered.countDown();
              new CountDownLatch(1).await();
            }));
    assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
    worker.stop();
    sql.update("UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second'");
    assertThat(repository.claim(Duration.ofSeconds(1))).isPresent();
  }

  @Test
  void rejectsInvalidOwnerPayloadPermanently() {
    publish("a");
    start(
        handler(
            j -> {
              throw new JobRejectedException("INVALID_PAYLOAD");
            }));
    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count("dead")).isEqualTo(1));
    assertThat(sql.queryForObject("SELECT attempts FROM operations.jobs", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void interruptsJobsAtTheExecutionDeadline() throws Exception {
    var interrupted = new CountDownLatch(1);
    publish("a");
    start(
        handler(
            j -> {
              try {
                new CountDownLatch(1).await();
              } catch (InterruptedException e) {
                interrupted.countDown();
                throw e;
              }
            }));
    assertThat(interrupted.await(5, TimeUnit.SECONDS)).isTrue();
    worker.stop();
    assertThat(repository.count("succeeded")).isZero();
  }

  @Test
  void enforcesDeadlineWhileSchemaIsUnavailable() throws Exception {
    var entered = new CountDownLatch(1);
    var interrupted = new CountDownLatch(1);
    publish("a");
    start(
        handler(
            j -> {
              entered.countDown();
              try {
                new CountDownLatch(1).await();
              } catch (InterruptedException e) {
                interrupted.countDown();
                throw e;
              }
            }));
    assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
    sql.update("UPDATE operations.schema_metadata SET generation=2");
    try {
      assertThat(interrupted.await(5, TimeUnit.SECONDS)).isTrue();
    } finally {
      worker.stop();
      sql.update("UPDATE operations.schema_metadata SET generation=1");
    }
  }

  @Test
  void countsUncooperativeExpiredAttemptsAgainstConcurrency() throws Exception {
    var entered = new CountDownLatch(2);
    var release = new CountDownLatch(1);
    publish("a");
    start(
        handler(
            j -> {
              entered.countDown();
              boolean done = false;
              while (!done) {
                try {
                  release.await();
                  done = true;
                } catch (InterruptedException ignored) {
                  /* Controlled uncooperative dependency. */
                }
              }
            }));
    try {
      await()
          .atMost(Duration.ofSeconds(5))
          .untilAsserted(() -> assertThat(entered.getCount()).isEqualTo(1));
      sql.update(
          "UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second'");
      assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
      sql.update(
          "UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second'");
      await()
          .during(Duration.ofMillis(200))
          .atMost(Duration.ofSeconds(1))
          .untilAsserted(
              () ->
                  assertThat(
                          sql.queryForObject("SELECT attempts FROM operations.jobs", Integer.class))
                      .isEqualTo(2));
    } finally {
      release.countDown();
    }
  }

  interface Action {
    void run(Job job) throws Exception;
  }

  JobHandler handler(Action action) {
    return new JobHandler() {
      public String type() {
        return "test";
      }

      public int version() {
        return 1;
      }

      public void handle(Job job) throws Exception {
        action.run(job);
      }
    };
  }
}
