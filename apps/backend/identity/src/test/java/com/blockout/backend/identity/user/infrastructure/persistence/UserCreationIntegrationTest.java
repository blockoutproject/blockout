package com.blockout.backend.identity.user.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import com.blockout.backend.identity.subscription.domain.BillingEnvironment;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.sql.Connection;
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

/**
 * Verifies atomic profile recreation with runtime SQL privileges and controlled provider evidence.
 */
@Testcontainers
class UserCreationIntegrationTest {
  @AutoClose static final ClassLoaderResourceAccessor resources = new ClassLoaderResourceAccessor();
  @Container static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:17-alpine");
  static JdbcTemplate admin;
  static JdbcTemplate sql;
  static TransactionTemplate tx;
  static PostgresUserProfiles profiles;
  static final Instant NOW = Instant.parse("2026-09-12T12:00:00Z");

  /** Migrates as owner, then wires profile writes through the restricted API database role. */
  @BeforeAll
  static void setup() throws SQLException, LiquibaseException {
    DriverManagerDataSource owner =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    admin = new JdbcTemplate(owner);
    admin.execute(
        "CREATE SCHEMA operations; CREATE SCHEMA identity; CREATE SCHEMA sports; CREATE ROLE blockout_api LOGIN PASSWORD 'test'; CREATE ROLE blockout_worker LOGIN PASSWORD 'test'; GRANT USAGE ON SCHEMA sports, identity, operations TO blockout_api, blockout_worker");
    try (Connection c = owner.getConnection();
        JdbcConnection connection = new JdbcConnection(c);
        Liquibase lb =
            new Liquibase("db/changelog/db.changelog-master.xml", resources, connection)) {
      lb.update("");
    }
    DriverManagerDataSource api =
        new DriverManagerDataSource(DB.getJdbcUrl(), "blockout_api", "test");
    sql = new JdbcTemplate(api);
    tx = new TransactionTemplate(new JdbcTransactionManager(api));
    tx.setTimeout(5);
    profiles = new PostgresUserProfiles(sql);
  }

  @BeforeEach
  void clean() {
    admin.execute("TRUNCATE identity.users CASCADE");
  }

  /**
   * Builds a test identity on the same canonical issuer.
   *
   * @param subject scenario-specific external subject
   * @return the exact identity key
   */
  ExternalIdentity actor(String subject) {
    return new ExternalIdentity("https://tenant.example/", subject);
  }

  /**
   * Builds nullable provider attributes without treating email as identity.
   *
   * @param email nullable email attribute
   * @return the synthetic external profile
   */
  ExternalProfile info(String email) {
    return new ExternalProfile(email, "First", "Last", null, null);
  }

  /**
   * Executes the real creation use case with controlled provider evidence and a fixed clock.
   *
   * @param actor canonical identity under test
   * @param info synthetic verified provider attributes
   * @return the owner result after its real PostgreSQL transaction
   */
  ProfileResult create(ExternalIdentity actor, ExternalProfile info) {
    return new UserProfiles(
            profiles,
            _ -> new IdentityLookup.Found(info),
            tx,
            Clock.fixed(NOW, ZoneOffset.UTC),
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {})
        .ensure(actor);
  }

  @Test
  void unrelatedDatasourceTransactionCannotAuthorizeProfileWrites() {
    DriverManagerDataSource other =
        new DriverManagerDataSource(DB.getJdbcUrl(), DB.getUsername(), DB.getPassword());
    TransactionTemplate otherTx = new TransactionTemplate(new JdbcTransactionManager(other));

    assertThatThrownBy(
            () ->
                otherTx.execute(
                    _ ->
                        profiles.create(
                            actor("apple|wrong-transaction"),
                            UUID.randomUUID(),
                            "person",
                            info(null),
                            NOW,
                            "project",
                            BillingEnvironment.PRODUCTION)))
        .isInstanceOf(IllegalStateException.class);
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.users", Integer.class)).isZero();
  }

  @Test
  void createsOneAtomicProfileWithTheOriginalBillingIdentity() {
    ExternalIdentity actor = actor("google-oauth2|first");
    ProfileResult.Available created =
        (ProfileResult.Available) create(actor, info("name@example.test"));
    assertThat(created.created()).isTrue();
    assertThat(created.profile().createdAt()).isEqualTo(NOW);
    assertThat(
            sql.queryForObject("SELECT customer_id FROM identity.billing_bindings", String.class))
        .isEqualTo(actor.subject());
    assertThat(sql.queryForObject("SELECT user_id FROM identity.external_identities", UUID.class))
        .isEqualTo(created.profile().id());
  }

  @Test
  void creationReturnsTheSameInstantsAsThePersistedProfile() {
    ExternalIdentity actor = actor("apple|precise-clock");
    UserProfiles service =
        new UserProfiles(
            profiles,
            _ -> new IdentityLookup.Found(info(null)),
            tx,
            Clock.fixed(Instant.parse("2026-10-25T01:30:00.123456789Z"), ZoneId.of("Europe/Paris")),
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {});

    ProfileResult.Available created = (ProfileResult.Available) service.ensure(actor);
    ProfileResult.Available read = (ProfileResult.Available) service.find(actor);

    assertThat(created.profile()).isEqualTo(read.profile());
    assertThat(read.profile().createdAt()).isEqualTo(Instant.parse("2026-10-25T01:30:00.123457Z"));
    assertThat(read.profile().updatedAt()).isEqualTo(read.profile().createdAt());
  }

  @Test
  void acceptsTwoDistinctIdentitiesWithTheSameEmail() {
    ProfileResult.Available first =
        (ProfileResult.Available) create(actor("google-oauth2|first"), info("same@example.test"));
    ProfileResult.Available second =
        (ProfileResult.Available) create(actor("apple|second"), info("same@example.test"));
    assertThat(second.profile().id()).isNotEqualTo(first.profile().id());
    assertThat(second.profile().pseudo()).isNotEqualTo(first.profile().pseudo());
  }

  @Test
  void supportsMissingProviderAttributes() {
    ProfileResult.Available created =
        (ProfileResult.Available)
            create(actor("apple|private"), new ExternalProfile(null, null, null, null, null));
    assertThat(created.profile().email()).isNull();
    assertThat(created.profile().pseudo()).isEqualTo("user");
  }

  @Test
  void concurrentFirstRequestsReturnOneProfile()
      throws InterruptedException, ExecutionException, TimeoutException {
    ExternalIdentity actor = actor("google-oauth2|concurrent");
    CountDownLatch start = new CountDownLatch(1);
    try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
      List<Future<ProfileResult.Available>> results = new ArrayList<>();
      for (int i = 0; i < 8; i++)
        results.add(
            pool.submit(
                () -> {
                  start.await();
                  return (ProfileResult.Available) create(actor, info("race@example.test"));
                }));
      start.countDown();
      List<ProfileResult.Available> values = new ArrayList<>();
      for (Future<ProfileResult.Available> result : results)
        values.add(result.get(15, TimeUnit.SECONDS));
      assertThat(values.stream().map(x -> x.profile().id()).distinct()).hasSize(1);
      assertThat(values.stream().filter(ProfileResult.Available::created)).hasSize(1);
    }
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.billing_bindings", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void concurrentPseudonymCollisionsKeepDistinctProfiles()
      throws InterruptedException, ExecutionException, TimeoutException {
    try (ExecutorService pool = Executors.newFixedThreadPool(6)) {
      List<Future<ProfileResult>> results = new ArrayList<>();
      for (int i = 0; i < 6; i++) {
        final int id = i;
        results.add(pool.submit(() -> create(actor("apple|" + id), info("same@example.test"))));
      }
      for (Future<ProfileResult> result : results)
        assertThat(result.get(15, TimeUnit.SECONDS)).isInstanceOf(ProfileResult.Available.class);
    }
    assertThat(
            sql.queryForObject(
                "SELECT count(DISTINCT pseudo_key) FROM identity.users", Integer.class))
        .isEqualTo(6);
  }

  @Test
  void existingProfileDoesNotDependOnAuth0() {
    ExternalIdentity actor = actor("apple|existing");
    create(actor, info("name@example.test"));
    UserProfiles service =
        new UserProfiles(
            profiles,
            _ -> {
              throw new AssertionError("Unexpected Auth0 call");
            },
            tx,
            Clock.fixed(NOW.plusSeconds(60), ZoneOffset.UTC),
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {});
    ProfileResult.Available result = (ProfileResult.Available) service.ensure(actor);
    assertThat(result.created()).isFalse();
    assertThat(result.profile().updatedAt()).isEqualTo(NOW);
    assertThat(service.find(actor)).isInstanceOf(ProfileResult.Available.class);
  }

  @Test
  void providerFailureCreatesNothing() {
    UserProfiles service =
        new UserProfiles(
            profiles,
            _ ->
                new IdentityLookup.Unavailable(IdentityFailureReason.IDENTITY_PROVIDER_UNAVAILABLE),
            tx,
            Clock.systemUTC(),
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {});
    assertThat(service.ensure(actor("apple|failed"))).isInstanceOf(ProfileResult.Unavailable.class);
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.users", Integer.class)).isZero();
  }

  @Test
  void providerCallRunsOutsideTheCreationTransaction() {
    UserProfiles service =
        new UserProfiles(
            profiles,
            _ -> {
              assertThat(
                      org.springframework.transaction.support.TransactionSynchronizationManager
                          .isActualTransactionActive())
                  .isFalse();
              return new IdentityLookup.Found(info(null));
            },
            tx,
            Clock.systemUTC(),
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {});
    assertThat(service.ensure(actor("apple|outside"))).isInstanceOf(ProfileResult.Available.class);
  }

  @Test
  void bindingFailureRollsBackProfileAndIdentity() {
    admin.execute(
        "ALTER TABLE identity.billing_bindings ADD CONSTRAINT test_failure CHECK (project_id <> 'project')");
    try {
      assertThatThrownBy(() -> create(actor("apple|rollback"), info(null)))
          .isInstanceOf(org.springframework.dao.DataAccessException.class);
      assertThat(sql.queryForObject("SELECT count(*) FROM identity.users", Integer.class)).isZero();
      assertThat(
              sql.queryForObject(
                  "SELECT count(*) FROM identity.external_identities", Integer.class))
          .isZero();
    } finally {
      admin.execute("ALTER TABLE identity.billing_bindings DROP CONSTRAINT test_failure");
    }
  }

  @Test
  void readDoesNotCreateAProfile() {
    UserProfiles service =
        new UserProfiles(
            profiles,
            _ -> {
              throw new AssertionError("Unexpected Auth0 call");
            },
            tx,
            Clock.systemUTC(),
            "project",
            BillingEnvironment.PRODUCTION,
            _ -> {});
    assertThat(service.find(actor("apple|missing"))).isInstanceOf(ProfileResult.Missing.class);
    assertThat(sql.queryForObject("SELECT count(*) FROM identity.users", Integer.class)).isZero();
  }

  @Test
  void inactiveProfileIsNotReactivated() {
    ExternalIdentity actor = actor("apple|inactive");
    create(actor, info(null));
    admin.execute("UPDATE identity.users SET active=false");
    assertThat(create(actor, info(null))).isInstanceOf(ProfileResult.Inactive.class);
  }
}
