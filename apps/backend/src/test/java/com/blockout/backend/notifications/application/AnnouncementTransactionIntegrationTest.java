package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.ProcessResultAnnouncement.Transition;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.notifications.infrastructure.NotificationEntity;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManager;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real F07/F06/F05 SQL, controlled producer/link state and deletion; no real erasure/after-commit
 * sender.
 */
@SpringBootTest
@Testcontainers
@DisplayName("Atomic announcement and recipient transactions on PostgreSQL")
class AnnouncementTransactionIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000010");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000011");
  private static final UUID PACK = UUID.fromString("00000000-0000-4000-8000-000000000012");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000013");
  private static final UUID HOME = UUID.fromString("00000000-0000-4000-8000-000000000014");
  private static final UUID AWAY = UUID.fromString("00000000-0000-4000-8000-000000000015");
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000016");
  private static final UUID SECOND = UUID.fromString("00000000-0000-4000-8000-000000000017");
  private static final Instant ORIGIN = Instant.parse("2026-10-24T12:00:00Z");
  @Autowired private JdbcTemplate sql;
  @Autowired private ProcessResultAnnouncement processor;
  @Autowired private NotificationStore notifications;
  @Autowired private EntityManager entities;
  @Autowired private AccountAccess accounts;
  @Autowired private PlatformTransactionManager transactions;

  /**
   * Migrates only this task's container before validation-only Spring startup.
   *
   * @param properties native Spring test properties
   * @throws Exception when explicit migration fails
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    System.out.println(
        "Announcement PostgreSQL container "
            + DATABASE.getContainerId()
            + " PostgreSQL port "
            + DATABASE.getMappedPort(5432));
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Creates synthetic accepted identities and confirmed follows, with no provider input.
   *
   * @throws Exception when fixture preparation fails
   */
  @BeforeEach
  void owners() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement fixture = connection.createStatement()) {
      fixture.execute("TRUNCATE sporting_season, sporting_division, account CASCADE");
    }
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', 'one', 'first', 'one@example.invalid'), (?, 'https://identity.example.invalid/', 'two', 'second', 'two@example.invalid')",
        ACCOUNT,
        OTHER);
    sql.update(
        "INSERT INTO sporting_season(id,start_year,label) VALUES (?,2026,'2026/2027')", SEASON);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic',TRUE,'#112233')",
        DIVISION);
    sql.update(
        "INSERT INTO sporting_pack(id,season_id,provider,organizer_reference,reference) VALUES (?,?,'LNV','synthetic','pack')",
        PACK,
        SEASON);
    sql.update(
        "INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,competition_reference,reference,source_name,division_id,format,gender) VALUES (?,?,?,'LNV','synthetic','competition','pool','Pool',?,'_6X6','MIXED')",
        POOL,
        SEASON,
        PACK,
        DIVISION);
    for (UUID team : List.of(HOME, AWAY)) {
      sql.update(
          "INSERT INTO sporting_team(id,season_id,provider,organizer_reference,competition_reference,native_reference,source_name,comparison_name,division_id,format,gender) VALUES (?,?,'LNV','synthetic','competition',?,'Team',? ,?,'_6X6','MIXED')",
          team,
          SEASON,
          team.toString(),
          team.toString(),
          DIVISION);
    }
    for (UUID match : List.of(MATCH, SECOND)) {
      sql.update(
          "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id) VALUES (?,?,?,?,?)",
          match,
          POOL,
          match.toString(),
          HOME,
          AWAY);
    }
    sql.update(
        "INSERT INTO team_follow(id,account_id,team_id) VALUES (?,?,?),(?,?,?)",
        UUID.randomUUID(),
        ACCOUNT,
        HOME,
        UUID.randomUUID(),
        ACCOUNT,
        AWAY);
    sql.update(
        "INSERT INTO pool_follow(id,account_id,pool_id) VALUES (?,?,?)",
        UUID.randomUUID(),
        ACCOUNT,
        POOL);
  }

  @Test
  @DisplayName("Creates one unread entry for the three-origin union with original relation IDs")
  void deduplicatesRecipients() {
    // Given: OTHER has no confirmed follow; no request state establishes one.
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    List<AllocateAnnouncements.Created> created =
        transaction.execute(
            status -> {
              roots(MATCH);
              return processor.process(transition(MATCH, false));
            });

    // Then
    assertThat(created)
        .singleElement()
        .satisfies(
            entry -> {
              assertThat(entry.entry().accountId()).isEqualTo(ACCOUNT);
              assertThat(entry.relations())
                  .extracting(Relation::id)
                  .containsExactlyInAnyOrderElementsOf(
                      sql.queryForList(
                          "SELECT id FROM team_follow UNION ALL SELECT id FROM pool_follow",
                          UUID.class));
              assertThat(entry.entry().createdAt()).isEqualTo(ORIGIN);
            });
    assertThat(count("notification")).isEqualTo(1);
    assertThat(sql.queryForObject("SELECT is_read FROM notification", Boolean.class)).isFalse();
    assertThat(sql.queryForObject("SELECT result_processed FROM match_announcement", Boolean.class))
        .isTrue();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Orders concurrent result/publication inputs under the same sporting roots")
  void serializesComposition(boolean publicationFirst) throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    AtomicBoolean publicLink = new AtomicBoolean();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          transaction.execute(
              status -> {
                roots(MATCH);
                if (publicationFirst) publicLink.set(true);
                else processor.process(transition(MATCH, false));
                Future<?> second =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  roots(MATCH);
                                  processor.process(transition(MATCH, publicLink.get()));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                if (publicationFirst) processor.process(transition(MATCH, true));
                else publicLink.set(true);
                return second;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(count("notification")).isEqualTo(1);
      assertThat(sql.queryForObject("SELECT family FROM notification", String.class))
          .isEqualTo(publicationFirst ? "ENRICHED_RESULT" : "PLAIN_RESULT");
      assertThat(
              sql.queryForObject(
                  "SELECT post_result_processed FROM match_announcement", Boolean.class))
          .isEqualTo(publicationFirst);
    }
  }

  @Test
  @DisplayName(
      "Rolls back one producer's sporting state, facts and entries on required SQL failure")
  void rollsBackOnlyFailedMatch() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        status -> {
          roots(SECOND);
          processor.process(transition(SECOND, false));
        });

    // When
    Throwable observedFailure =
        catchThrowable(
            () ->
                transaction.executeWithoutResult(
                    status -> {
                      roots(MATCH);
                      sql.update(
                          "UPDATE sporting_match SET home_sets=3, away_sets=1, result_state='FINAL' WHERE id=?",
                          MATCH);
                      processor.process(transition(MATCH, false));
                      // A distinct UUID still violates the required owner/match/family invariant.
                      notifications.create(
                          new AllocateAnnouncements.Entry(
                              UUID.randomUUID(),
                              ACCOUNT,
                              MATCH,
                              NotificationFamily.PLAIN_RESULT,
                              NotificationVariant.FIRST,
                              ORIGIN));
                    }));

    // Then
    assertThat(observedFailure).isInstanceOf(DataIntegrityViolationException.class);

    // Then
    assertThat(count("notification")).isEqualTo(1);
    assertThat(count("match_announcement")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, MATCH))
        .isNull();
    assertThat(sql.queryForObject("SELECT match_id FROM notification", UUID.class))
        .isEqualTo(SECOND);
  }

  @Test
  @DisplayName("An external after-commit failure preserves the committed producer and inbox")
  void preservesCommittedEffects() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    Throwable observedFailure =
        catchThrowable(
            () ->
                transaction.executeWithoutResult(
                    status -> {
                      roots(MATCH);
                      sql.update(
                          "UPDATE sporting_match SET home_sets=3, away_sets=1, result_state='FINAL' WHERE id=?",
                          MATCH);
                      processor.process(transition(MATCH, false));
                      TransactionSynchronizationManager.registerSynchronization(
                          new TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                              throw new IllegalStateException("Controlled after-commit failure");
                            }
                          });
                    }));

    // Then
    assertThat(observedFailure).isInstanceOf(IllegalStateException.class);

    // Then
    assertThat(count("notification")).isEqualTo(1);
    assertThat(count("match_announcement")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, MATCH))
        .isEqualTo("FINAL");
  }

  @Test
  @DisplayName("Rechecks a relation removed while the result waits for its account lock")
  void excludesRemovedFollows() throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<?> writer =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  roots(MATCH);
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  processor.process(transition(MATCH, false));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                sql.update("DELETE FROM team_follow WHERE account_id=?", ACCOUNT);
                sql.update("DELETE FROM pool_follow WHERE account_id=?", ACCOUNT);
                return writer;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(count("notification")).isZero();
      assertThat(count("match_announcement")).isEqualTo(1);
    }
  }

  @Test
  @DisplayName(
      "Account-row deletion before the waiting recipient lock cannot resurrect personal data")
  void excludesDeletedAccount() throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<?> writer =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  roots(MATCH);
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  processor.process(transition(MATCH, false));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                sql.update("DELETE FROM team_follow WHERE account_id=?", ACCOUNT);
                sql.update("DELETE FROM pool_follow WHERE account_id=?", ACCOUNT);
                sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
                return writer;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(count("notification")).isZero();
      assertThat(count("match_announcement")).isEqualTo(1);
    }
  }

  @Test
  @DisplayName("Purge and corrections preserve consumed result composition and read origin")
  void preservesLifetime() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, false));
        });
    UUID original = sql.queryForObject("SELECT id FROM notification", UUID.class);
    transaction.executeWithoutResult(
        status -> {
          NotificationEntity entry = entities.find(NotificationEntity.class, original);
          entry.markRead();
          entry.markRead();
        });

    // When
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, true));
        });

    // Then
    assertThat(sql.queryForObject("SELECT id FROM notification", UUID.class)).isEqualTo(original);
    assertThat(sql.queryForObject("SELECT is_read FROM notification", Boolean.class)).isTrue();
    assertThat(
            sql.queryForObject("SELECT created_at FROM notification", OffsetDateTime.class)
                .toInstant())
        .isEqualTo(ORIGIN);
    sql.update("DELETE FROM notification");
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, true));
        });
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject("SELECT result_composition FROM match_announcement", String.class))
        .isEqualTo(NotificationFamily.PLAIN_RESULT.name());
  }

  @Test
  @DisplayName("Creating an existing notification UUID cannot reset its retained read state")
  void rejectsExistingPersonalIdentity() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    AllocateAnnouncements.Entry original =
        transaction.execute(
            status -> {
              roots(MATCH);
              return processor.process(transition(MATCH, false)).getFirst().entry();
            });
    transaction.executeWithoutResult(
        status -> {
          accounts.lock(ACCOUNT);
          entities.find(NotificationEntity.class, original.id()).markRead();
        });

    // When
    Throwable duplicate =
        catchThrowable(
            () ->
                transaction.executeWithoutResult(
                    status -> {
                      roots(MATCH);
                      accounts.lock(ACCOUNT);
                      notifications.create(original);
                    }));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT is_read FROM notification WHERE id=?", Boolean.class, original.id()))
        .isTrue();
    assertThat(duplicate).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(count("notification")).isEqualTo(1);
  }

  @Test
  @DisplayName("Zero-recipient processing cannot backfill a follow added later")
  void recordsEmptyAudience() {
    // Given
    sql.update("DELETE FROM team_follow");
    sql.update("DELETE FROM pool_follow");
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, false));
        });

    // When
    sql.update(
        "INSERT INTO pool_follow(id,account_id,pool_id) VALUES (?,?,?)",
        UUID.randomUUID(),
        OTHER,
        POOL);
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, true));
        });

    // Then
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject("SELECT result_composition FROM match_announcement", String.class))
        .isEqualTo("PLAIN_RESULT");
    assertThat(
            sql.queryForObject(
                "SELECT post_result_processed FROM match_announcement", Boolean.class))
        .isFalse();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Silent final discovery or reconstruction with a link preserves the later-publication allowance")
  void preservesUnusedPostResultCategory(boolean discovery) {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    Transition silent =
        new Transition(
            new MatchView(MATCH, POOL, "controlled", HOME, AWAY),
            null,
            new Result(ResultStateEnum.FINAL, 3, 1, null),
            discovery,
            !discovery,
            true,
            true,
            ORIGIN);

    // When
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(silent);
        });
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, true));
        });

    // Then
    assertThat(count("notification")).isZero();
    assertThat(sql.queryForObject("SELECT result_processed FROM match_announcement", Boolean.class))
        .isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT post_result_processed FROM match_announcement", Boolean.class))
        .isFalse();
    assertThat(
            sql.queryForObject("SELECT result_composition FROM match_announcement", String.class))
        .isNull();
  }

  @Test
  @DisplayName("Locks the complete candidate set in sorted account UUID order")
  void sortsAccountLocks() throws Exception {
    // Given
    sql.update(
        "INSERT INTO pool_follow(id,account_id,pool_id) VALUES (?,?,?)",
        UUID.randomUUID(),
        OTHER,
        POOL);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          transaction.execute(
              status -> {
                accounts.lock(OTHER);
                Future<?> writer =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  roots(MATCH);
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  processor.process(transition(MATCH, false));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                // The writer must already hold ACCOUNT when it waits for the later OTHER UUID.

                // When
                Throwable observedFailure =
                    catchThrowable(
                        () ->
                            independent.execute(
                                inner ->
                                    sql.queryForObject(
                                        "SELECT id FROM account WHERE id=? FOR UPDATE NOWAIT",
                                        UUID.class,
                                        ACCOUNT)));

                // Then
                assertThat(observedFailure)
                    .isInstanceOfSatisfying(
                        UncategorizedSQLException.class,
                        failure ->
                            assertThat(failure.getSQLException().getSQLState()).isEqualTo("55P03"));
                return writer;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(count("notification")).isEqualTo(2);
    }
  }

  @Test
  @DisplayName(
      "Controlled deletion waits for creation and removes entries while retaining match facts")
  void deletionAfterCreation() throws Exception {
    // Given
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          transaction.execute(
              status -> {
                roots(MATCH);
                processor.process(transition(MATCH, false));
                Future<?> deletion =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  accounts.lock(ACCOUNT);
                                  sql.update("DELETE FROM team_follow WHERE account_id=?", ACCOUNT);
                                  sql.update("DELETE FROM pool_follow WHERE account_id=?", ACCOUNT);
                                  sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                return deletion;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(count("notification")).isZero();
      assertThat(count("match_announcement")).isEqualTo(1);
    }
  }

  @Test
  @DisplayName("PostgreSQL enforces owner/match/family uniqueness and required allocation values")
  void enforcesAllocationConstraints() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        status -> {
          roots(MATCH);
          processor.process(transition(MATCH, false));
        });
    String insert =
        "INSERT INTO notification(id,account_id,match_id,family,variant,created_at,is_read) VALUES (?,?,?,'PLAIN_RESULT','FIRST',?,FALSE)";

    // When: independent statements reach PostgreSQL, rather than parsing migration text.
    Throwable observedFailure =
        catchThrowable(
            () -> sql.update(insert, UUID.randomUUID(), ACCOUNT, MATCH, Timestamp.from(ORIGIN)));

    // Then
    assertThat(observedFailure).isInstanceOf(DataIntegrityViolationException.class);

    // When
    Throwable secondFailure =
        catchThrowable(() -> sql.update(insert, UUID.randomUUID(), OTHER, MATCH, null));

    // Then
    assertThat(secondFailure).isInstanceOf(DataIntegrityViolationException.class);

    // When
    Throwable thirdFailure =
        catchThrowable(
            () ->
                sql.update(
                    insert, UUID.randomUUID(), UUID.randomUUID(), MATCH, Timestamp.from(ORIGIN)));

    // Then
    assertThat(thirdFailure).isInstanceOf(DataIntegrityViolationException.class);
    assertThat(count("notification")).isEqualTo(1);
  }

  /**
   * Controlled producer acquires every necessary F02 root before entering F07/account work.
   *
   * @param match scenario's original match UUID
   */
  private void roots(UUID match) {
    sql.queryForObject("SELECT id FROM sporting_season WHERE id=? FOR UPDATE", UUID.class, SEASON);
    sql.queryForObject("SELECT id FROM sporting_match WHERE id=? FOR UPDATE", UUID.class, match);
  }

  /**
   * Supplies the controlled current-link read and accepted finality under the retained roots.
   *
   * @param match scenario's original match UUID
   * @param link controlled current F08 availability, never inferred from professional media
   * @return trusted test transition for the mandatory F07 participant
   */
  private Transition transition(UUID match, boolean link) {
    return new Transition(
        new MatchView(match, POOL, match.toString(), HOME, AWAY),
        null,
        new Result(ResultStateEnum.FINAL, 3, 1, null),
        false,
        false,
        true,
        link,
        ORIGIN);
  }

  /**
   * Counts only fixed feature-owned table names supplied in this test.
   *
   * @param table fixed local table name
   * @return committed row count
   */
  private long count(String table) {
    return sql.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
  }
}
