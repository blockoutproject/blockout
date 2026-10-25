package com.blockout.backend.notifications.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.infrastructure.NotificationRetentionConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.hibernate.SessionFactory;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Actual migrated purge/read/create boundaries; clock and SQL interruption are test controlled. */
@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Daily notification retention on PostgreSQL")
@Testcontainers
class PurgeNotificationsIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private PurgeInspector inspector;
  @Autowired private EntityManagerFactory entityManagerFactory;
  @Autowired private NotificationRetentionConfiguration daily;
  @Autowired private PurgeNotifications.DeleteExpiredEntries batch;
  @Autowired private ReadInbox reads;
  @Autowired private MarkNotificationRead marks;
  @Autowired private NotificationStore store;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private Clock clock;

  /**
   * Uses the existing disposable database and a test-only statement failure boundary.
   *
   * @param properties native isolated configuration
   * @throws Exception on migration failure
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
    properties.add(
        "spring.jpa.properties.hibernate.session_factory.statement_inspector",
        () -> PurgeInspector.class.getName());
  }

  /**
   * Prepares only synthetic original owners and sporting records.
   *
   * @throws Exception on fixture failure
   */
  @BeforeEach
  void owners() throws Exception {
    inspector =
        (PurgeInspector)
            entityManagerFactory
                .unwrap(SessionFactory.class)
                .getSessionFactoryOptions()
                .getStatementInspector();
    reset(DATABASE, sql);
    when(clock.instant()).thenReturn(NOW);
  }

  /** Releases this suite's injected SQL interruption. */
  @AfterEach
  void clearFailure() {
    inspector.failMatch = null;
  }

  @ParameterizedTest
  @EnumSource(NotificationFamily.class)
  @DisplayName("Purges every expired read/hidden combination while retaining the younger boundary")
  void removesAllStates(NotificationFamily family) {
    // Given
    Instant cutoff = NOW.minus(Duration.ofDays(29));
    List<Instant> ages = List.of(cutoff.plusNanos(1000), cutoff, NOW.minus(Duration.ofDays(31)));
    int number = 0;
    for (boolean read : List.of(false, true)) {
      for (boolean hidden : List.of(false, true)) {
        for (Instant created : ages) {
          UUID id = entry(sql, ++number, read ? OTHER : ACCOUNT, created);
          sql.update(
              "UPDATE notification SET family=?,is_read=? WHERE id=?", family.name(), read, id);
          sql.update("UPDATE sporting_match SET present=? WHERE id=?", !hidden, id);
          sql.update(
              "INSERT INTO match_announcement(match_id,live_processed,result_processed,post_result_processed,result_composition) VALUES (?,TRUE,TRUE,TRUE,'ENRICHED_RESULT')",
              id);
        }
      }
    }

    // When
    daily.purge();

    // Then
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isEqualTo(4);
    assertThat(sql.queryForList("SELECT created_at FROM notification", OffsetDateTime.class))
        .allSatisfy(created -> assertThat(created.toInstant()).isEqualTo(cutoff.plusNanos(1000)));
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM match_announcement WHERE live_processed AND result_processed AND post_result_processed AND result_composition='ENRICHED_RESULT'",
                Long.class))
        .isEqualTo(12);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM account", Long.class)).isEqualTo(2);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Long.class)).isEqualTo(12);
  }

  @ParameterizedTest
  @CsvSource({
    "Europe/Paris, 2026-03-30T01:30:00Z",
    "America/New_York, 2026-03-09T06:30:00Z",
    "Europe/Paris, 2026-10-26T02:30:00Z",
    "America/New_York, 2026-11-02T07:30:00Z"
  })
  @DisplayName("Uses 24-hour elapsed days across spring and autumn time changes")
  void ignoresDaylightSaving(String zone, Instant now) {
    // Given
    Instant cutoff = now.minus(Duration.ofDays(29));
    UUID retained = entry(sql, 1, ACCOUNT, cutoff.plusNanos(1000));
    entry(sql, 2, ACCOUNT, cutoff);
    PurgeNotifications purge = new PurgeNotifications(batch, Clock.fixed(now, ZoneId.of(zone)));

    // When
    purge.run();

    // Then
    assertThat(sql.queryForList("SELECT id FROM notification", UUID.class))
        .containsExactly(retained);
  }

  @Test
  @DisplayName("Keeps committed batches after interruption and removes remaining rows next day")
  void resumesNextDailyPass(CapturedOutput output) {
    // Given
    for (int i = 1; i <= 105; i++)
      entry(sql, i, ACCOUNT, NOW.minus(Duration.ofDays(31)).plusSeconds(i));
    UUID survivor = entry(sql, 200, ACCOUNT, NOW.minusSeconds(60));
    AtomicBoolean failed = new AtomicBoolean();
    inspector.failMatch =
        statement -> {
          if (statement.startsWith("delete from notification")
              && sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class) == 6
              && failed.compareAndSet(false, true)) {
            throw new IllegalStateException("synthetic-private-notification-content");
          }
        };

    // When
    daily.purge();

    // Then
    assertThat(failed).isTrue();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isEqualTo(6);
    NotificationContext owner = new NotificationContext(ACCOUNT);
    assertThat(reads.page(owner, null).entries())
        .extracting(InboxViews.Entry::id)
        .containsExactly(survivor);
    assertThat(reads.summary(owner).unreadCount()).isEqualTo(1);
    UUID expired = UUID.fromString("10000000-0000-4000-8000-000000000105");
    assertThatThrownBy(() -> reads.member(owner, expired))
        .isInstanceOf(NotificationNotFoundException.class);
    assertThatThrownBy(() -> marks.mark(owner, expired))
        .isInstanceOf(NotificationNotFoundException.class);
    assertThat(output.getAll())
        .contains(
            "\"operation\":\"notification_retention\"",
            "\"outcome\":\"incomplete\"",
            "\"partial_count\":100")
        .doesNotContain("\"outcome\":\"completed\"");
    assertThat(output.getAll())
        .doesNotContain(
            "synthetic-private-notification-content", ACCOUNT.toString(), expired.toString());

    // When
    inspector.failMatch = null;
    when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(1)));
    daily.purge();

    // Then
    assertThat(sql.queryForList("SELECT id FROM notification", UUID.class))
        .containsExactly(survivor);
    assertThat(reads.member(owner, survivor).createdAt()).isEqualTo(NOW.minusSeconds(60));
  }

  @Test
  @DisplayName(
      "Preserves a committed read while purge waits and accepts a concurrent new allocation")
  void racesReadAndCreate() throws Exception {
    // Given
    UUID expired = entry(sql, 1, ACCOUNT, NOW.minus(Duration.ofDays(29)).plusSeconds(1));
    UUID retained = entry(sql, 2, ACCOUNT, NOW.minusSeconds(60));
    UUID newMatch = entry(sql, 3, OTHER, NOW);
    sql.update("DELETE FROM notification WHERE id=?", newMatch);
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> purgePid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> purging =
          transaction.execute(
              status -> {
                marks.mark(new NotificationContext(ACCOUNT), expired);
                marks.mark(new NotificationContext(ACCOUNT), retained);
                when(clock.instant()).thenReturn(NOW.plusSeconds(1));
                Future<?> pending =
                    worker.submit(
                        () -> {
                          // Use the production proxied batch; its REQUIRES_NEW transaction owns
                          // deletion.
                          inspector.failMatch =
                              statement -> {
                                if (statement.startsWith("delete from notification")) {
                                  purgePid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                }
                              };
                          daily.purge();
                        });
                PostgresTestDatabase.awaitBlocked(sql, purgePid);
                store.create(
                    new AllocateAnnouncements.Entry(
                        newMatch,
                        ACCOUNT,
                        newMatch,
                        NotificationFamily.PLAIN_RESULT,
                        com.blockout.backend.notifications.domain.NotificationVariant.FIRST,
                        NOW));
                return pending;
              });

      // When
      purging.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(sql.queryForList("SELECT id FROM notification", UUID.class))
          .containsExactlyInAnyOrder(retained, newMatch);
      assertThat(reads.member(new NotificationContext(ACCOUNT), retained).read()).isTrue();
      assertThat(reads.member(new NotificationContext(ACCOUNT), retained).createdAt())
          .isEqualTo(NOW.minusSeconds(60));
      assertThatThrownBy(() -> marks.mark(new NotificationContext(ACCOUNT), expired))
          .isInstanceOf(NotificationNotFoundException.class);
    }
  }

  @Test
  @DisplayName("Keeps committed purge removals when an unrelated caller rolls back")
  void commitsIndependentlyOfCallerRollback() {
    // Given
    entry(sql, 1, ACCOUNT, NOW.minus(Duration.ofDays(30)));
    TransactionTemplate caller = new TransactionTemplate(transactions);

    // When
    caller.executeWithoutResult(
        status -> {
          daily.purge();
          status.setRollbackOnly();
        });

    // Then
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
  }

  @Test
  @DisplayName("Purges during maintenance without removing a still-needed follow")
  void purgesDuringMaintenance() {
    // Given
    entry(sql, 1, ACCOUNT, NOW.minus(Duration.ofDays(30)));
    UUID relation = UUID.fromString("30000000-0000-4000-8000-000000000001");
    sql.update(
        "INSERT INTO team_follow(id,account_id,team_id) VALUES (?,?,?)",
        relation,
        ACCOUNT,
        com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.HOME);
    sql.update("UPDATE access_settings SET active=TRUE WHERE id='maintenance'");
    try {
      // When
      daily.purge();

      // Then
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM team_follow WHERE id=?", Long.class, relation))
          .isEqualTo(1);
    } finally {
      sql.update("UPDATE access_settings SET active=FALSE WHERE id='maintenance'");
    }
  }

  /** Test-only SQL hook injects one real transaction failure or observes its lock attempt. */
  public static class PurgeInspector implements StatementInspector {
    private static final long serialVersionUID = 1L;
    private volatile java.util.function.Consumer<String> failMatch;

    /** {@inheritDoc} */
    @Override
    public String inspect(String statement) {
      java.util.function.Consumer<String> callback = failMatch;
      if (callback != null) callback.accept(statement);
      return statement;
    }
  }
}
