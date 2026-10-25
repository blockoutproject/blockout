package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.sporting.application.model.MatchObservation;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;

/** Real minute-pass entry point, sporting reads, publication and current confirmed F06 audience. */
@DisplayName("Actual link publication and minute eligibility pass")
class LinkAnnouncementIntegrationTest extends ContributionScenario {
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

    // When
    ThrowingCallable invoke = () -> transaction.executeWithoutResult(status -> due.run());

    // Then
    assertThatThrownBy(invoke).isInstanceOf(IllegalTransactionStateException.class);
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
  @DisplayName("A controlled withdrawal before H prevents the due announcement")
  void excludesWithdrawnLink() {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    UUID version = submit(AUTHOR, "0", "https://youtube.com/advance", true).version().id();
    follow(FOLLOWER);
    sql.update("UPDATE contribution_version SET state='WITHDRAWN' WHERE id=?", version);
    when(clock.instant()).thenReturn(NOW.plusSeconds(90));

    // When
    due.run();

    // Then
    assertThat(count("notification")).isZero();
    assertThat(count("match_announcement")).isZero();
  }

  @Test
  @DisplayName("Current sporting hiding prevents an otherwise due public-link announcement")
  void excludesHiddenMatch() {
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

    // When
    due.run();

    // Then
    assertThat(count("notification")).isZero();
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
    sql.update(
        "INSERT INTO notification(id,account_id,match_id,family,variant,created_at,is_read) VALUES (?,?,?,'LIVE_LINK','FIRST',?,FALSE)",
        UUID.randomUUID(),
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
