package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.application.ModerateContribution;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.notifications.application.ProcessDueLinkAnnouncements.ProcessDueMatch;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;

/** Real minute pass with a spy observing only whether the candidate transaction is invoked. */
@DisplayName("Actual link publication and minute eligibility pass")
class LinkAnnouncementIntegrationTest extends ContributionScenario {

  @Autowired private MatchContributionAccess sporting;
  @Autowired private ModerateContribution moderation;
  @MockitoSpyBean private ProcessDueMatch dueMatch;

  @Test
  @DisplayName("Rejects an enclosing transaction before a due candidate can be processed")
  void rejectsEnclosingTransaction() {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    follow(FOLLOWER);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When / Then
    assertThatThrownBy(() -> transaction.executeWithoutResult(status -> due.run()))
        .isInstanceOf(IllegalTransactionStateException.class);
    assertThat(count("notification")).isZero();
    assertThat(count("match_announcement")).isZero();
  }

  @Test
  @DisplayName("Advance publication uses the audience present at actual minute processing")
  void selectsAtProcessing() {
    // Given
    Instant start = NOW.plusSeconds(172800);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?", Timestamp.from(start), matchId);
    moderator(AUTHOR);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    follow(FOLLOWER);
    when(clock.instant()).thenReturn(start.minusSeconds(1));
    due.run();
    assertThat(count("notification")).isZero();
    follow(OTHER);
    when(clock.instant()).thenReturn(start.plusSeconds(37));

    // When
    due.run();
    due.run();

    // Then
    assertThat(count("notification")).isEqualTo(2);
    assertThat(sql.queryForList("SELECT family FROM notification", String.class))
        .containsOnly("LIVE_LINK");
    assertThat(sql.queryForList("SELECT account_id FROM notification", UUID.class))
        .containsExactlyInAnyOrder(FOLLOWER, OTHER);
  }

  @Test
  @DisplayName(
      "An unknown start waits for actual F02 confirmation without resetting an already processed live fact")
  void waitsForConfirmedStart() {
    // Given
    sql.update("UPDATE sporting_match SET reliable_start=NULL,local_time=NULL WHERE id=?", matchId);
    moderator(AUTHOR);
    follow(FOLLOWER);
    submit(AUTHOR, "0", "https://youtube.com/unknown", true);
    due.run();
    assertThat(count("notification")).isZero();

    // When
    matches.detail(
        new MatchObservation(
            matchId,
            context(2),
            mapper.toFacts(
                new MatchFactsInternalRequest()._localTime("14:00").timeZone("Europe/Paris"))));
    due.run();
    matches.detail(
        new MatchObservation(
            matchId,
            context(3),
            mapper.toFacts(
                new MatchFactsInternalRequest()._localTime("13:00").timeZone("Europe/Paris"))));
    due.run();

    // Then
    assertThat(count("notification")).isEqualTo(1);
  }

  @Test
  @DisplayName("A selected candidate observes a link withdrawal committed before its sporting lock")
  void rechecksPresenceAfterLockWait() throws Exception {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    UUID version = submit(AUTHOR, "0", "https://youtube.com/advance", true).version().id();
    follow(FOLLOWER);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> waiting =
          transaction.execute(
              status -> {
                sporting.lock(matchId);
                int locker = sql.queryForObject("SELECT pg_backend_pid()", Integer.class);
                Future<?> pass = worker.submit(due::run);
                // The page selects without locks. Only the subsequent match transaction waits here.
                await()
                    .atMost(Duration.ofSeconds(10))
                    .until(
                        () ->
                            sql.queryForObject(
                                """
                                SELECT EXISTS (
                                  SELECT 1 FROM pg_locks
                                  WHERE NOT granted AND ? = ANY(pg_blocking_pids(pid))
                                )
                                """,
                                Boolean.class,
                                locker));
                moderation.change(
                    AUTHOR, matchId, version, "1", StreamModerationActionEnum.WITHDRAW);
                return pass;
              });
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(
              sql.queryForObject(
                  "SELECT state FROM contribution_version WHERE id=?", String.class, version))
          .isEqualTo("WITHDRAWN");
      assertThat(count("notification")).isZero();
      assertThat(count("match_announcement")).isZero();
    }
  }

  @Test
  @DisplayName("A due link can be announced once sporting visibility returns")
  void reconsidersRestoredVisibility() {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    follow(FOLLOWER);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    due.run();
    assertThat(count("notification")).isZero();
    assertThat(count("match_announcement")).isZero();

    // When
    sql.update("UPDATE sporting_match SET present=TRUE WHERE id=?", matchId);
    due.run();

    // Then
    assertThat(sql.queryForList("SELECT match_id FROM notification", UUID.class))
        .containsExactly(matchId);
    assertThat(
            sql.queryForList(
                "SELECT match_id FROM match_announcement WHERE live_processed", UUID.class))
        .containsExactly(matchId);
  }

  @Test
  @DisplayName("A consumed live allowance with no recipients skips the next match transaction")
  void skipsEmptyAudienceConsumption() {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    due.run();
    assertThat(
            sql.queryForList(
                "SELECT match_id FROM match_announcement WHERE live_processed", UUID.class))
        .containsExactly(matchId);
    follow(FOLLOWER);
    clearInvocations(dueMatch);

    // When
    due.run();

    // Then
    verify(dueMatch, never()).process(matchId);
    assertThat(count("notification")).isZero();
  }

  @Test
  @Timeout(30)
  @DisplayName("The minute pass reaches a rescheduled candidate beyond the first UUID page")
  void reachesRescheduledCandidateOnNextPage() {
    // Given
    UUID last = UUID.fromString("00000000-0000-4000-8000-000000000101");
    sql.update(
        """
        INSERT INTO sporting_match(id, pool_id, reference, home_team_id, away_team_id, local_date, reliable_start)
        SELECT ('00000000-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid,
               pool_id, 'page-candidate-' || number, home_team_id, away_team_id, local_date, ?
        FROM sporting_match CROSS JOIN generate_series(1, 101) AS candidate(number)
        WHERE id=?
        """,
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    sql.update(
        """
        INSERT INTO contribution_version(id, match_id, address, platform, state, created_at, quota_participating)
        SELECT gen_random_uuid(), id, 'https://youtube.com/advance', 'YOUTUBE', 'ACTIVE', ?, FALSE
        FROM sporting_match WHERE reference LIKE 'page-candidate-%'
        """,
        Timestamp.from(NOW));
    sql.update("INSERT INTO match_announcement(match_id, result_processed) VALUES (?, TRUE)", last);
    follow(FOLLOWER);

    // When
    sql.update("UPDATE sporting_match SET reliable_start=? WHERE id=?", Timestamp.from(NOW), last);
    due.run();

    // Then
    assertThat(sql.queryForList("SELECT match_id FROM notification", UUID.class))
        .containsExactly(last);
    assertThat(
            sql.queryForList(
                "SELECT match_id FROM match_announcement WHERE live_processed", UUID.class))
        .containsExactly(last);
  }

  @Test
  @DisplayName("One failing due match rolls back while another match commits independently")
  void isolatesFailingCandidate() {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    UUID second = UUID.fromString("00000000-0000-4000-8000-000000000099");
    sql.update(
        "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,reliable_start) SELECT ?,pool_id,'second-due',home_team_id,away_team_id,local_date,reliable_start FROM sporting_match WHERE id=?",
        second,
        matchId);
    submissions.submit(AUTHOR, second, "0", URI.create("https://youtube.com/second"), true);
    follow(FOLLOWER);
    UUID existingNotification = UUID.fromString("00000000-0000-4000-8000-000000002841");
    sql.update(
        "INSERT INTO notification(id,account_id,match_id,family,variant,created_at,is_read) VALUES (?,?,?,'LIVE_LINK','FIRST',?,FALSE)",
        existingNotification,
        FOLLOWER,
        matchId,
        Timestamp.from(NOW));
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));

    // When
    due.run();

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM match_announcement WHERE match_id=?", Long.class, matchId))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT live_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                second))
        .isTrue();
    assertThat(count("notification")).isEqualTo(2);
  }
}
