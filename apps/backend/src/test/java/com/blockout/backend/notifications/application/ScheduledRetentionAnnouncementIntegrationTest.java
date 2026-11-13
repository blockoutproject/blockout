package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.infrastructure.NotificationRetentionConfiguration;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Real F02/F06/F08 announcement owners after the actual daily F07 purge, with controlled time. */
@DisplayName("Scheduled retention and later sporting publications")
class ScheduledRetentionAnnouncementIntegrationTest extends ContributionScenario {
  @Autowired private NotificationRetentionConfiguration daily;
  @Autowired private ReadInbox inbox;
  @Autowired private MarkNotificationRead marks;

  @Test
  @DisplayName("A purged plain result permits one genuinely new replay with its own original age")
  void permitsUnusedReplayAfterScheduledPurge() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    UUID result = sql.queryForObject("SELECT id FROM notification", UUID.class);
    moderator(AUTHOR);
    Instant publication = NOW.plus(Duration.ofDays(29));
    when(clock.instant()).thenReturn(publication);

    // When
    daily.purge();

    // Then
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT result_processed AND NOT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();

    // When
    submit(AUTHOR, "0", "https://youtube.com/synthetic-replay", true);
    InboxViews.Entry replay =
        inbox.page(new NotificationContext(FOLLOWER), null).entries().getFirst();
    when(clock.instant()).thenReturn(publication.plusSeconds(3600));
    marks.mark(new NotificationContext(FOLLOWER), replay.id());
    submit(AUTHOR, "1", "https://youtube.com/synthetic-replacement", true);
    result(3, null);
    result(4, ResultStateEnum.FINAL);
    daily.purge();

    // Then
    assertThat(replay.id()).isNotEqualTo(result);
    assertThat(replay.family()).isEqualTo(NotificationFamily.POST_RESULT_LINK);
    assertThat(replay.createdAt()).isEqualTo(publication);
    assertThat(count("notification")).isEqualTo(1);
    InboxViews.Entry surviving = inbox.member(new NotificationContext(FOLLOWER), replay.id());
    assertThat(surviving.read()).isTrue();
    assertThat(surviving.createdAt()).isEqualTo(publication);
    assertThat(
            sql.queryForObject(
                "SELECT result_composition FROM match_announcement WHERE match_id=?",
                String.class,
                matchId))
        .isEqualTo("PLAIN_RESULT");
    assertThat(
            sql.queryForObject(
                "SELECT result_processed AND post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();

    // When
    when(clock.instant()).thenReturn(publication.plus(Duration.ofDays(29)));
    daily.purge();
    submit(AUTHOR, "2", "https://youtube.com/synthetic-after-replay-purge", true);
    result(5, null);
    result(6, ResultStateEnum.FINAL);
    due.run();

    // Then
    assertThat(count("notification")).isZero();
    assertThat(count("sporting_match")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, matchId))
        .isEqualTo("FINAL");
  }

  @Test
  @DisplayName("Purging live and enriched result entries never replenishes any consumed category")
  void preservesConsumedCategoriesAfterScheduledPurge() {
    // Given
    follow(FOLLOWER);
    submit(AUTHOR, "0", "https://youtube.com/synthetic-live", false);
    result(2, ResultStateEnum.FINAL);
    assertThat(count("notification")).isEqualTo(2);
    assertThat(sql.queryForList("SELECT created_at FROM notification", OffsetDateTime.class))
        .allSatisfy(created -> assertThat(created.toInstant()).isEqualTo(NOW));
    moderator(AUTHOR);
    when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(29)));

    // When
    daily.purge();
    submit(AUTHOR, "1", "https://youtube.com/synthetic-replaced-live", true);
    result(3, null);
    result(4, ResultStateEnum.FINAL);
    due.run();
    daily.purge();

    // Then
    assertThat(inbox.page(new NotificationContext(FOLLOWER), null).entries()).isEmpty();
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT live_processed AND result_processed AND post_result_processed AND result_composition='ENRICHED_RESULT' FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, matchId))
        .isEqualTo("FINAL");
  }
}
