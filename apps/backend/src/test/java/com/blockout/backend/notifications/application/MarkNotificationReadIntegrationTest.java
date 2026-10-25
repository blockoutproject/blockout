package com.blockout.backend.notifications.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real committed read writes and controlled removals; actual erasure/purge belong to T052. */
@SpringBootTest
@DisplayName("Monotone notification reading on PostgreSQL")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class MarkNotificationReadIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private MarkNotificationRead marks;
  @Autowired private ReadInbox reads;
  @Autowired private JdbcTemplate sql;
  @Autowired private AccountAccess accounts;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private Clock clock;

  /**
   * Prepares synthetic owning data and the controlled evaluation instant.
   *
   * @throws Exception on fixture failure
   */
  @BeforeEach
  void owners() throws Exception {
    reset(database, sql);
    when(clock.instant()).thenReturn(NOW);
  }

  @Test
  @DisplayName("Repeated true preserves the original creation, family and ordering")
  void marksWithoutReset() {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    NotificationContext owner = new NotificationContext(ACCOUNT);

    // When
    InboxViews.Entry first = marks.mark(owner, id);
    InboxViews.Entry second = marks.mark(owner, id);

    // Then
    assertThat(first.read()).isTrue();
    assertThat(second).isEqualTo(first);
    assertThat(reads.member(owner, id).read()).isTrue();
    assertThat(
            sql.queryForObject(
                    "SELECT created_at FROM notification WHERE id=?", OffsetDateTime.class, id)
                .toInstant())
        .isEqualTo(NOW.minusSeconds(60));
    assertThat(reads.summary(owner).unreadCount()).isZero();
  }

  @Test
  @DisplayName("An expired entry cannot be marked or recreated")
  void rejectsExpired() {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW.minus(Duration.ofDays(29)));

    // When
    Throwable observedFailure =
        catchThrowable(() -> marks.mark(new NotificationContext(ACCOUNT), id));

    // Then
    assertThat(observedFailure).isInstanceOf(NotificationNotFoundException.class);
    assertThat(sql.queryForObject("SELECT is_read FROM notification WHERE id=?", Boolean.class, id))
        .isFalse();
  }

  @Test
  @DisplayName("Concurrent repeated read intents retain true without moving the entry")
  void serializesMarks() throws Exception {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    NotificationContext owner = new NotificationContext(ACCOUNT);
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<InboxViews.Entry> repeated =
          transaction.execute(
              status -> {
                marks.mark(owner, id);
                Future<InboxViews.Entry> waiting =
                    worker.submit(
                        () ->
                            transaction.execute(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return marks.mark(owner, id);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                return waiting;
              });

      // When
      InboxViews.Entry result = repeated.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(result.read()).isTrue();
      assertThat(result.createdAt()).isEqualTo(NOW.minusSeconds(60));
      assertThat(reads.member(owner, id).read()).isTrue();
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"account", "notification"})
  @DisplayName("A waiting mark cannot recreate a controlled removed owner or personal entry")
  void rejectsDeletedOwner(String removed) throws Exception {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          transaction.execute(
              status -> {
                accounts.lock(ACCOUNT);
                Future<?> mark =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  marks.mark(new NotificationContext(ACCOUNT), id);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                if (removed.equals("account"))
                  sql.update("DELETE FROM account WHERE id=?", ACCOUNT);
                else sql.update("DELETE FROM notification WHERE id=?", id);
                return mark;
              });

      // When
      Throwable observedFailure = catchThrowable(() -> waiting.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(observedFailure)
          .isInstanceOf(ExecutionException.class)
          .hasCauseInstanceOf(NotificationNotFoundException.class);
      assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
      if (removed.equals("account")) {

        // When
        Throwable secondFailure =
            catchThrowable(() -> reads.summary(new NotificationContext(ACCOUNT)));

        // Then
        assertThat(secondFailure).isInstanceOf(NotificationNotFoundException.class);
      } else assertThat(reads.summary(new NotificationContext(ACCOUNT)).unreadCount()).isZero();
    }
  }

  @Test
  @DisplayName("A committed read is visible after an overlapping snapshot read finishes")
  void reconcilesConcurrentRead() throws Exception {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);
    NotificationContext owner = new NotificationContext(ACCOUNT);
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      transaction.executeWithoutResult(
          status -> {
            marks.mark(owner, id);
            Future<InboxViews.Entry> previous = worker.submit(() -> reads.member(owner, id));
            try {
              assertThat(previous.get(15, TimeUnit.SECONDS).read()).isFalse();
            } catch (Exception failure) {
              throw new AssertionError(failure);
            }
          });

      // When
      InboxViews.Entry committed = reads.member(owner, id);

      // Then
      assertThat(committed.read()).isTrue();
      assertThat(reads.summary(owner).unreadCount()).isZero();
    }
  }

  @Test
  @DisplayName("Foreign, hidden and removed entries never receive a read write")
  void refusesUnavailableEntry() {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);

    // When
    Throwable observedFailure =
        catchThrowable(() -> marks.mark(new NotificationContext(OTHER), id));

    // Then
    assertThat(observedFailure).isInstanceOf(NotificationNotFoundException.class);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", id);

    // When
    Throwable secondFailure =
        catchThrowable(() -> marks.mark(new NotificationContext(ACCOUNT), id));

    // Then
    assertThat(secondFailure).isInstanceOf(NotificationNotFoundException.class);
    assertThat(sql.queryForObject("SELECT is_read FROM notification WHERE id=?", Boolean.class, id))
        .isFalse();
    sql.update("DELETE FROM notification WHERE id=?", id);

    // When
    Throwable thirdFailure = catchThrowable(() -> marks.mark(new NotificationContext(ACCOUNT), id));

    // Then
    assertThat(thirdFailure).isInstanceOf(NotificationNotFoundException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
  }

  @Test
  @DisplayName("Reading and controlled personal removal preserve non-personal consumed facts")
  void preservesConsumedFacts() {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);
    sql.update(
        "INSERT INTO match_announcement(match_id,live_processed,result_processed,post_result_processed,result_composition) VALUES (?,TRUE,TRUE,TRUE,'ENRICHED_RESULT')",
        id);

    // When
    marks.mark(new NotificationContext(ACCOUNT), id);
    sql.update("DELETE FROM notification WHERE id=?", id);

    // Then
    assertThat(reads.page(new NotificationContext(ACCOUNT), null).entries()).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT result_composition FROM match_announcement WHERE match_id=?",
                String.class,
                id))
        .isEqualTo("ENRICHED_RESULT");
    assertThat(
            sql.queryForObject(
                "SELECT live_processed AND result_processed AND post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                id))
        .isTrue();
  }
}
