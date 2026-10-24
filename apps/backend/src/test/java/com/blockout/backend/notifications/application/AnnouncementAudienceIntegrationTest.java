package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.sql.Timestamp;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real follow turnover during recipient locking; no historical audience or provider is simulated.
 */
@DisplayName("Announcement audience turnover under account locks")
class AnnouncementAudienceIntegrationTest extends ContributionScenario {
  @Autowired private ProcessDueLinkAnnouncements.DueMatch dueMatch;

  @Test
  @DisplayName("An audience turnover aborts processing without consuming the category")
  void preservesAllowanceForNewAudience() throws Exception {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    follow(FOLLOWER);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, FOLLOWER);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  dueMatch.process(matchId);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                // B is confirmed before A leaves, so there is never an empty confirmed audience.
                independent.executeWithoutResult(inner -> follow(OTHER));
                follows.replace(
                    new FollowContext(
                        FOLLOWER,
                        new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool())),
                    false);
                return future;
              });

      // When
      Throwable failure = catchThrowable(() -> waiting.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(count("match_announcement")).isZero();
      assertThat(count("notification")).isZero();
      assertThat(failure).hasCauseInstanceOf(AnnouncementAudienceChangedException.class);
      due.run();
      assertThat(sql.queryForList("SELECT account_id FROM notification", UUID.class))
          .containsExactly(OTHER);
      assertThat(
              sql.queryForObject(
                  "SELECT live_processed FROM match_announcement WHERE match_id=?",
                  Boolean.class,
                  matchId))
          .isTrue();
    }
  }
}
