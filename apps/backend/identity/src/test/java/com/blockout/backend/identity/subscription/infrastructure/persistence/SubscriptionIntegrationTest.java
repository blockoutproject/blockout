package com.blockout.backend.identity.subscription.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.identity.subscription.domain.*;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import com.blockout.backend.identity.user.infrastructure.persistence.PostgresUserProfiles;
import com.blockout.backend.jobs.application.*;
import com.blockout.backend.jobs.infrastructure.persistence.*;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
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
 * Exercises real revision, privilege, lease and receipt transactions using the Liquibase baseline.
 */
@Testcontainers
class SubscriptionIntegrationTest {
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  @AutoClose static final ClassLoaderResourceAccessor RESOURCES = new ClassLoaderResourceAccessor();
  static JdbcTemplate admin;
  static Subscriptions api, worker;
  static PostgresSubscriptions store;
  static PostgresJobRepository jobs;
  static TransactionTemplate apiTx;
  static PostgresUserProfiles profiles;
  static final Instant NOW = Instant.parse("2026-09-13T12:00:00Z");
  static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

  /** Runs real migrations and constructs separate API/worker roles on the shared engine. */
  @BeforeAll
  static void setup() throws SQLException, LiquibaseException {
    DriverManagerDataSource owner =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    admin = new JdbcTemplate(owner);
    admin.execute(
        "CREATE SCHEMA identity;CREATE SCHEMA operations;CREATE ROLE blockout_api LOGIN PASSWORD 'test';CREATE ROLE blockout_worker LOGIN PASSWORD 'test';GRANT USAGE ON SCHEMA identity,operations TO blockout_api,blockout_worker");
    try (JdbcConnection connection = new JdbcConnection(owner.getConnection());
        Liquibase lb =
            new Liquibase("db/changelog/db.changelog-master.xml", RESOURCES, connection)) {
      lb.update("");
    }
    DriverManagerDataSource apiData =
        new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_api", "test");
    DriverManagerDataSource workerData =
        new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_worker", "test");
    JdbcTemplate apiSql = new JdbcTemplate(apiData);
    JdbcTemplate workerSql = new JdbcTemplate(workerData);
    apiTx = new TransactionTemplate(new JdbcTransactionManager(apiData));
    TransactionTemplate workerTx = new TransactionTemplate(new JdbcTransactionManager(workerData));
    jobs = new PostgresJobRepository(workerSql, workerTx);
    store = new PostgresSubscriptions(workerSql);
    api =
        new Subscriptions(
            new PostgresSubscriptions(apiSql),
            new PostgresJobPublisher(apiSql, new JsonMapper()),
            new PostgresJobRepository(apiSql, apiTx),
            apiTx,
            CLOCK);
    worker =
        new Subscriptions(
            store, new PostgresJobPublisher(workerSql, new JsonMapper()), jobs, workerTx, CLOCK);
    profiles = new PostgresUserProfiles(apiSql);
  }

  @BeforeEach
  void clean() {
    admin.execute("TRUNCATE identity.users,identity.webhook_receipts,operations.jobs CASCADE");
  }

  /**
   * Creates one real profile with atomic initial subscription work.
   *
   * @param subject retained synthetic subject
   * @return new business owner UUID
   */
  UUID create(String subject) {
    ProfileResult result =
        new UserProfiles(
                profiles,
                _ -> new IdentityLookup.Found(new ExternalProfile(null, null, null, null, null)),
                apiTx,
                CLOCK,
                "project",
                BillingEnvironment.PRODUCTION,
                api::initialize)
            .ensure(new ExternalIdentity("https://tenant.example/", subject));
    return ((ProfileResult.Available) result).profile().id();
  }

  @Test
  void publishesInitialWorkWithTheRetainedBinding() {
    UUID id = create("auth0|one");
    assertThat(api.find(id).state()).isEqualTo(SubscriptionState.UNKNOWN);
    assertThat(api.find(id).refreshState()).isEqualTo(SubscriptionView.RefreshState.PENDING);
    assertThat(store.find(id).orElseThrow().binding().customerId()).isEqualTo("auth0|one");
    assertThat(admin.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class)).isOne();
  }

  @Test
  void publicationFailureRollsBackProfileCreation() {
    UserProfiles service =
        new UserProfiles(
            profiles,
            _ -> new IdentityLookup.Found(new ExternalProfile(null, null, null, null, null)),
            apiTx,
            CLOCK,
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {
              throw new IllegalStateException("publication failed");
            });
    assertThatThrownBy(
            () -> service.ensure(new ExternalIdentity("https://tenant.example/", "auth0|rollback")))
        .isInstanceOf(IllegalStateException.class);
    assertThat(admin.queryForObject("SELECT count(*) FROM identity.users", Integer.class)).isZero();
    assertThat(
            admin.queryForObject("SELECT count(*) FROM identity.billing_bindings", Integer.class))
        .isZero();
  }

  @Test
  void concurrentUserRequestsCoalesce() throws Exception {
    UUID id = create("auth0|parallel");
    try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
      Future<?> first = executor.submit(() -> api.refresh(id));
      Future<?> second = executor.submit(() -> api.refresh(id));
      first.get();
      second.get();
    }
    assertThat(admin.queryForObject("SELECT count(*) FROM operations.jobs", Integer.class)).isOne();
    assertThat(store.find(id).orElseThrow().requestedRevision()).isEqualTo(2);
  }

  @Test
  void newerRequestDuringReadGetsASuccessorWithoutStaleEvidence() {
    UUID id = create("auth0|newer");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    api.refresh(id);
    assertThat(
            jobs.completeWithEffect(
                job,
                () ->
                    worker.verified(
                        captured, new SubscriptionObservation.Verified(true, null), NOW)))
        .isTrue();
    assertThat(api.find(id).state()).isEqualTo(SubscriptionState.UNKNOWN);
    assertThat(jobs.claim(Duration.ofSeconds(60))).isPresent();
    assertThat(store.find(id).orElseThrow().processedRevision()).isZero();
  }

  @Test
  void expiredAttemptCannotCommitPositiveEvidence() {
    UUID id = create("auth0|lease");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    admin.update(
        "UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=?",
        job.id());
    assertThat(
            jobs.completeWithEffect(
                job,
                () ->
                    worker.verified(
                        captured, new SubscriptionObservation.Verified(true, null), NOW)))
        .isFalse();
    assertThat(store.find(id).orElseThrow().evidence().positive()).isNull();
  }

  @Test
  void failureEffectRollsBackWithQueueTransition() {
    UUID id = create("auth0|failure");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    assertThatThrownBy(
            () ->
                jobs.failWithEffect(
                    job,
                    "PROVIDER_FAILURE",
                    Duration.ofSeconds(30),
                    false,
                    () -> {
                      store.failed(id, SubscriptionFailure.UNAVAILABLE, NOW);
                      throw new IllegalStateException("rollback");
                    }))
        .isInstanceOf(IllegalStateException.class);
    assertThat(store.find(id).orElseThrow().evidence().failure()).isNull();
    assertThat(jobs.state(job.id())).contains(JobState.RUNNING);
  }

  @Test
  void providerFailureNeverAdvancesVerifiedTime() {
    UUID id = create("auth0|positive");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    jobs.completeWithEffect(
        job,
        () ->
            worker.verified(
                captured, new SubscriptionObservation.Verified(true, null), NOW.minusSeconds(700)));
    api.refresh(id);
    Job retry = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot current = store.find(id).orElseThrow();
    SubscriptionObservation.Failed failure =
        new SubscriptionObservation.Failed(
            SubscriptionFailure.UNAVAILABLE, Duration.ofSeconds(60), false);
    jobs.failWithEffect(
        retry,
        "PROVIDER_FAILURE",
        failure.retryAfter(),
        false,
        () -> worker.failed(current, failure, false));
    assertThat(api.find(id).state()).isEqualTo(SubscriptionState.GRACE);
    assertThat(api.find(id).verifiedAt()).isEqualTo(NOW.minusSeconds(700));
  }

  @Test
  void transferDeduplicatesAndInvalidatesBothKnownSidesSafely() {
    UUID outgoing = create("auth0|from");
    UUID incoming = create("auth0|to");
    api.webhook(
        "transfer-1",
        "TRANSFER",
        NOW,
        "project",
        BillingEnvironment.PRODUCTION,
        Set.of("auth0|from", "auth0|to", "unknown"),
        Set.of("auth0|from"));
    long revision = store.find(outgoing).orElseThrow().requestedRevision();
    api.webhook(
        "transfer-1",
        "TRANSFER",
        NOW,
        "project",
        BillingEnvironment.PRODUCTION,
        Set.of("auth0|from", "auth0|to"),
        Set.of("auth0|from"));
    assertThat(store.find(outgoing).orElseThrow().requestedRevision()).isEqualTo(revision);
    assertThat(store.find(incoming).orElseThrow().requestedRevision()).isEqualTo(2);
    assertThat(
            admin.queryForObject("SELECT count(*) FROM identity.webhook_receipts", Integer.class))
        .isOne();
    assertThat(admin.queryForObject("SELECT count(*) FROM identity.users", Integer.class))
        .isEqualTo(2);
  }

  @Test
  void failedWorkCanStartANewBudget() {
    UUID id = create("auth0|dead");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    jobs.fail(job, "CONFIGURATION", Duration.ZERO, true);
    assertThat(api.find(id).refreshState()).isEqualTo(SubscriptionView.RefreshState.FAILED);
    api.refresh(id);
    assertThat(store.find(id).orElseThrow().jobId()).isNotEqualTo(job.id());
    assertThat(jobs.claim(Duration.ofSeconds(60)).orElseThrow().attempts()).isOne();
  }

  @Test
  void transferCannotBeUndoneByAnInFlightPositiveRead() {
    UUID id = create("auth0|transfer-race");
    Job initial = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot first = store.find(id).orElseThrow();
    jobs.completeWithEffect(
        initial,
        () -> worker.verified(first, new SubscriptionObservation.Verified(true, null), NOW));
    api.refresh(id);
    Job running = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    api.webhook(
        "transfer-race",
        "TRANSFER",
        NOW,
        "project",
        BillingEnvironment.PRODUCTION,
        Set.of("auth0|transfer-race"),
        Set.of("auth0|transfer-race"));
    jobs.completeWithEffect(
        running,
        () -> worker.verified(captured, new SubscriptionObservation.Verified(true, null), NOW));
    assertThat(api.proAccess(id)).isEqualTo(Subscriptions.ProAccess.UNAVAILABLE);
    assertThat(store.find(id).orElseThrow().evidence().positive()).isNull();
    assertThat(jobs.claim(Duration.ofSeconds(60))).isPresent();
  }

  @Test
  void completeNegativeEvidenceRevokesProImmediately() {
    UUID id = create("auth0|negative");
    Job initial = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot first = store.find(id).orElseThrow();
    jobs.completeWithEffect(
        initial,
        () -> worker.verified(first, new SubscriptionObservation.Verified(true, null), NOW));
    assertThat(api.proAccess(id)).isEqualTo(Subscriptions.ProAccess.ALLOWED);
    api.refresh(id);
    Job second = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    jobs.completeWithEffect(
        second,
        () -> worker.verified(captured, new SubscriptionObservation.Verified(false, null), NOW));
    assertThat(api.proAccess(id)).isEqualTo(Subscriptions.ProAccess.REQUIRED);
  }

  @Test
  void bootstrapFindsEarlierProfilesWithoutSubscriptionWork() {
    UUID id = create("auth0|bootstrap");
    admin.execute("TRUNCATE identity.subscription_states,operations.jobs");
    assertThat(worker.reconcileDue()).isOne();
    assertThat(store.find(id)).isPresent();
    assertThat(jobs.claim(Duration.ofSeconds(60))).isPresent();
  }

  @Test
  void expiredFailureCannotWriteDiagnostics() {
    UUID id = create("auth0|stale-failure");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    admin.update(
        "UPDATE operations.jobs SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=?",
        job.id());
    assertThat(
            jobs.failWithEffect(
                job,
                "PROVIDER_FAILURE",
                Duration.ZERO,
                false,
                () -> store.failed(id, SubscriptionFailure.UNAVAILABLE, NOW)))
        .isFalse();
    assertThat(store.find(id).orElseThrow().evidence().failure()).isNull();
  }

  @Test
  void terminalFailurePreservesARequestArrivingDuringItsRead() {
    UUID id = create("auth0|terminal-newer");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    api.refresh(id);
    SubscriptionObservation.Failed failure =
        new SubscriptionObservation.Failed(SubscriptionFailure.CONFIGURATION, Duration.ZERO, true);
    jobs.failWithEffect(
        job,
        "PROVIDER_CONFIGURATION",
        Duration.ZERO,
        true,
        () -> worker.failed(captured, failure, true));
    assertThat(jobs.state(job.id())).contains(JobState.DEAD);
    assertThat(store.find(id).orElseThrow().jobId()).isNotEqualTo(job.id());
    assertThat(jobs.claim(Duration.ofSeconds(60))).isPresent();
  }

  @Test
  void periodicRecoveryWaitsAfterCrashExhaustion() {
    UUID id = create("auth0|periodic-dead");
    Job job = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    SubscriptionSnapshot captured = store.find(id).orElseThrow();
    jobs.completeWithEffect(
        job,
        () ->
            worker.verified(
                captured, new SubscriptionObservation.Verified(true, null), NOW.minusSeconds(700)));
    api.refresh(id);
    Job failing = jobs.claim(Duration.ofSeconds(60)).orElseThrow();
    jobs.fail(failing, "EXHAUSTED", Duration.ZERO, true);
    admin.update(
        "UPDATE operations.jobs SET finished_at=? WHERE id=?",
        java.sql.Timestamp.from(NOW),
        failing.id());
    assertThat(worker.reconcileDue()).isOne();
    assertThat(store.find(id).orElseThrow().jobId()).isEqualTo(failing.id());
    assertThat(jobs.claim(Duration.ofSeconds(60))).isEmpty();
    assertThat(store.find(id).orElseThrow().nextRefreshAt()).isEqualTo(NOW.plusSeconds(900));
  }
}
