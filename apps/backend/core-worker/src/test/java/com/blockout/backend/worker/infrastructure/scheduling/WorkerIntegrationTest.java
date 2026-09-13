package com.blockout.backend.worker.infrastructure.scheduling;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobHandler;
import com.blockout.backend.jobs.application.JobResult;
import com.blockout.backend.jobs.application.JobState;
import com.blockout.backend.jobs.infrastructure.health.SchemaHealthIndicator;
import com.blockout.backend.jobs.infrastructure.persistence.PostgresJobPublisher;
import com.blockout.backend.jobs.infrastructure.persistence.PostgresJobRepository;
import com.blockout.backend.worker.application.JobExecutionService;
import com.blockout.backend.worker.application.WorkerTelemetry;
import com.blockout.backend.worker.config.WorkerProperties;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises scheduling, deadlines and fenced outcomes with real PostgreSQL and controlled handlers.
 */
@Testcontainers
class WorkerIntegrationTest {
  @AutoClose static final ClassLoaderResourceAccessor resources = new ClassLoaderResourceAccessor();
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static JdbcTemplate sql;
  static TransactionTemplate tx;
  static PostgresJobRepository repository;
  static PostgresJobPublisher publisher;
  JobWorker worker;
  SimpleMeterRegistry metrics;

  /** Applies the production baseline and wires queue adapters on one shared test datasource. */
  @BeforeAll
  static void setup() throws SQLException, LiquibaseException {
    DriverManagerDataSource ds =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    sql = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new JdbcTransactionManager(ds));
    try (Connection c = ds.getConnection();
        Statement statement = c.createStatement()) {
      statement.execute(
          "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE ROLE blockout_api; CREATE ROLE blockout_worker");
      try (JdbcConnection connection = new JdbcConnection(c);
          Liquibase lb =
              new Liquibase("db/changelog/db.changelog-master.xml", resources, connection)) {
        lb.update("");
      }
    }
    repository = new PostgresJobRepository(sql, tx);
    publisher = new PostgresJobPublisher(sql, new JsonMapper());
  }

  @BeforeEach
  void clean() {
    sql.execute("TRUNCATE operations.jobs");
  }

  @AfterEach
  void stop() {
    if (worker != null) worker.stop();
    if (metrics != null) metrics.close();
  }

  /**
   * Starts bounded scheduling with short fixture timings and test-owned metrics.
   *
   * @param handler single supported handler, or null to exercise unsupported work
   */
  void start(JobHandler handler) {
    metrics = new SimpleMeterRegistry();
    WorkerTelemetry telemetry = new WorkerTelemetry(repository, metrics);
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
            new JobExecutionService(
                repository, handler == null ? List.of() : List.of(handler), telemetry),
            telemetry,
            new SchemaHealthIndicator(sql));
    worker.start();
  }

  /**
   * Publishes a version-one test job through a real owner transaction.
   *
   * @param key scenario-specific deduplication key
   */
  void publish(String key) {
    tx.executeWithoutResult(_ -> publisher.publish("test", 1, key, Map.of()));
  }

  @Test
  void processesSupportedWork() {
    AtomicInteger executions = new AtomicInteger();
    publish("a");

    start(handler(_ -> executions.incrementAndGet()));

    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count(JobState.SUCCEEDED)).isEqualTo(1));

    assertThat(executions).hasValue(1);
  }

  @Test
  void drainsFastJobsWithoutWastingReservedAttempts() {
    for (int i = 0; i < 100; i++) publish("fast-" + i);

    start(handler(_ -> {}));

    await()
        .atMost(Duration.ofSeconds(10))
        .untilAsserted(() -> assertThat(repository.count(JobState.SUCCEEDED)).isEqualTo(100));
    assertThat(sql.queryForObject("SELECT max(attempts) FROM operations.jobs", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void boundsConcurrencyAndRenewsLeases() throws InterruptedException {
    for (int i = 0; i < 5; i++) publish("" + i);
    CountDownLatch entered = new CountDownLatch(2);
    CountDownLatch release = new CountDownLatch(1);
    AtomicInteger active = new AtomicInteger();
    AtomicInteger peak = new AtomicInteger();

    start(
        handler(
            _ -> {
              int n = active.incrementAndGet();
              peak.accumulateAndGet(n, Math::max);
              entered.countDown();
              release.await();
              active.decrementAndGet();
            }));

    assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
    Timestamp initial =
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

    assertThat(repository.count(JobState.RUNNING)).isEqualTo(2);
    release.countDown();

    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count(JobState.SUCCEEDED)).isEqualTo(5));

    assertThat(peak.get()).isLessThanOrEqualTo(2);
  }

  @Test
  void unknownTypesBecomeDead() {
    publish("a");

    start(null);

    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count(JobState.DEAD)).isEqualTo(1));
  }

  @Test
  void failedHandlerSchedulesRetry() {
    publish("a");

    start(
        handler(
            _ -> {
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

    assertThat(repository.count(JobState.PENDING)).isEqualTo(1);
  }

  @Test
  void incompatibleSchemaPreventsConsumption() {
    sql.update("UPDATE operations.schema_metadata SET generation=5");
    try {
      publish("a");
      start(
          handler(
              _ -> {
                throw new AssertionError("must not execute");
              }));
      worker.tick();
      assertThat(repository.count(JobState.PENDING)).isEqualTo(1);
    } finally {
      sql.update("UPDATE operations.schema_metadata SET generation=4");
    }
  }

  @Test
  void shutdownLeavesInterruptedWorkRecoverable() throws InterruptedException {
    CountDownLatch entered = new CountDownLatch(1);
    publish("a");

    start(
        handler(
            _ -> {
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

    start(resultHandler(_ -> new JobResult.Rejected("INVALID_PAYLOAD")));

    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count(JobState.DEAD)).isEqualTo(1));

    assertThat(sql.queryForObject("SELECT attempts FROM operations.jobs", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void interruptsJobsAtTheExecutionDeadline() throws InterruptedException {
    CountDownLatch interrupted = new CountDownLatch(1);
    publish("a");

    start(
        handler(
            _ -> {
              try {
                new CountDownLatch(1).await();
              } catch (InterruptedException e) {
                interrupted.countDown();
                throw e;
              }
            }));

    assertThat(interrupted.await(5, TimeUnit.SECONDS)).isTrue();
    worker.stop();

    assertThat(repository.count(JobState.SUCCEEDED)).isZero();
  }

  @Test
  void enforcesDeadlineWhileSchemaIsUnavailable() throws InterruptedException {
    CountDownLatch entered = new CountDownLatch(1);
    CountDownLatch interrupted = new CountDownLatch(1);
    publish("a");

    start(
        handler(
            _ -> {
              entered.countDown();
              try {
                new CountDownLatch(1).await();
              } catch (InterruptedException e) {
                interrupted.countDown();
                throw e;
              }
            }));

    assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
    sql.update("UPDATE operations.schema_metadata SET generation=5");
    try {
      assertThat(interrupted.await(5, TimeUnit.SECONDS)).isTrue();
    } finally {
      worker.stop();
      sql.update("UPDATE operations.schema_metadata SET generation=4");
    }
  }

  @Test
  void countsUncooperativeExpiredAttemptsAgainstConcurrency() throws InterruptedException {
    CountDownLatch entered = new CountDownLatch(2);
    CountDownLatch release = new CountDownLatch(1);
    publish("a");

    start(
        handler(
            _ -> {
              entered.countDown();
              boolean done = false;
              while (!done) {
                try {
                  release.await();
                  done = true;
                } catch (InterruptedException _) {
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

  /** Allows blocking test effects to participate in cooperative worker interruption. */
  interface Action {
    /**
     * Runs a controlled fixture effect with the claimed attempt.
     *
     * @param job attempt supplied by the worker
     */
    void run(Job job) throws InterruptedException;
  }

  /**
   * Adapts a controlled external effect into a successful handler result.
   *
   * @param action fixture effect which may block or fail
   * @return a version-one test handler
   */
  JobHandler handler(Action action) {
    return resultHandler(
        job -> {
          action.run(job);
          return new JobResult.Completed();
        });
  }

  /** Allows scenarios to select completed, SQL-effect or rejected handler outcomes. */
  interface ResultAction {
    /**
     * Produces the scenario-selected result for a claimed attempt.
     *
     * @param job attempt supplied by the worker
     * @return the controlled handler outcome
     */
    JobResult run(Job job) throws InterruptedException;
  }

  /**
   * Wraps a result-producing fixture as the single test type/version handler.
   *
   * @param action scenario-owned outcome producer
   * @return a handler registered only by this test
   */
  JobHandler resultHandler(ResultAction action) {
    return new JobHandler() {
      /** {@inheritDoc} */
      @Override
      public String type() {
        return "test";
      }

      /** {@inheritDoc} */
      @Override
      public int version() {
        return 1;
      }

      /** {@inheritDoc} */
      @Override
      public JobResult handle(Job job) throws InterruptedException {
        return action.run(job);
      }
    };
  }

  @Test
  void commitsSqlEffectWithSuccessAndCountsCompletionOnce() {
    sql.execute("CREATE TABLE IF NOT EXISTS operations.test_effects(job_id uuid PRIMARY KEY)");
    sql.execute("TRUNCATE operations.test_effects");
    publish("sql");

    start(
        resultHandler(
            job ->
                new JobResult.SqlEffect(
                    () ->
                        sql.update(
                            "INSERT INTO operations.test_effects(job_id) VALUES (?)", job.id()))));

    await()
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(
            () -> {
              assertThat(repository.count(JobState.SUCCEEDED)).isEqualTo(1);
              assertThat(
                      sql.queryForObject(
                          "SELECT count(*) FROM operations.test_effects", Integer.class))
                  .isEqualTo(1);
              assertThat(
                      metrics
                          .get("blockout.jobs.executions")
                          .tag("outcome", "completed")
                          .counter()
                          .count())
                  .isEqualTo(1);
            });
  }

  @Test
  void expectedFailureCommitsItsEffectWithProviderRetryDelay() {
    publish("provider-delay");
    Job job = repository.claim(Duration.ofSeconds(60)).orElseThrow();
    metrics = new SimpleMeterRegistry();
    JobHandler handler =
        new JobHandler() {
          /** {@inheritDoc} */
          @Override
          public String type() {
            return "test";
          }

          /** {@inheritDoc} */
          @Override
          public int version() {
            return 1;
          }

          /** {@inheritDoc} */
          @Override
          public JobResult handle(Job attempt) {
            return new JobResult.Failed(
                "PROVIDER_RATE_LIMITED",
                Duration.ofSeconds(60),
                false,
                () -> sql.update("UPDATE operations.schema_metadata SET generation=4"));
          }
        };
    new JobExecutionService(repository, List.of(handler), new WorkerTelemetry(repository, metrics))
        .execute(job, new AtomicBoolean());
    assertThat(repository.count(JobState.PENDING)).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT available_at > clock_timestamp()+interval '55 seconds' FROM operations.jobs",
                Boolean.class))
        .isTrue();
    assertThat(sql.queryForObject("SELECT last_error_code FROM operations.jobs", String.class))
        .isEqualTo("PROVIDER_RATE_LIMITED");
  }
}
