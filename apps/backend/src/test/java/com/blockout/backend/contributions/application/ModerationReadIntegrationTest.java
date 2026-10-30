package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.mobile.model.StreamModerationFilterEnum;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamVersionFilterEnum;
import java.sql.Timestamp;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Actual PostgreSQL literal search, independent counts and deterministic native private pages. */
@DisplayName("Private moderation reads")
class ModerationReadIntegrationTest extends ContributionScenario {
  @Autowired private ReadModeration moderation;
  @Autowired private jakarta.persistence.EntityManager entities;

  @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
  private ModerationStore readStore;

  @Test
  @DisplayName("Literal ILIKE and platform/state constraints select the same version")
  void searchesLiteralCombinedCriteria() {
    // Given
    moderator(OTHER);
    submit(OTHER, "0", "https://youtu.be/Literal_%25!fragment", true);
    submit(OTHER, "1", "https://twitch.tv/other", true);

    // When
    ReadModeration.Queue literal =
        moderation.queue(
            OTHER,
            null,
            "literal_%25!",
            StreamPlatformEnum.YOUTUBE,
            StreamModerationFilterEnum.REPLACED,
            0);

    // Then
    assertThat(literal.items()).extracting(item -> item.match().id()).containsExactly(matchId);
    assertThat(
            moderation
                .queue(
                    OTHER,
                    null,
                    "literal_%25!",
                    StreamPlatformEnum.TWITCH,
                    StreamModerationFilterEnum.ALL,
                    0)
                .items())
        .isEmpty();
    assertThat(
            moderation.queue(OTHER, null, "   ", null, StreamModerationFilterEnum.ALL, 0).items())
        .hasSize(1);
    assertThatThrownBy(() -> moderation.queue(OTHER, UUID.randomUUID(), "", null, null, 0))
        .isInstanceOf(
            com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException
                .class);
    assertThatThrownBy(() -> moderation.queue(OTHER, null, "", null, null, 107374183))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("Private hidden dateless context never grants publication")
  void readsHiddenContext() {
    // Given
    moderator(OTHER);
    submit(OTHER, "0", "https://youtu.be/retained", true);
    sql.update("UPDATE sporting_match SET local_date=NULL,present=FALSE WHERE id=?", matchId);

    // When
    ReadModeration.Match detail = moderation.read(OTHER, matchId, null, 0);

    // Then
    assertThat(detail.match().publiclyViewable()).isFalse();
    assertThat(detail.match().schedule()).isNull();
    assertThat(detail.canPublish()).isFalse();
    assertThat(detail.activeContribution().version().address().value())
        .isEqualTo("https://youtu.be/retained");
    assertThat(detail.activeContribution().canPublish()).isFalse();
  }

  @Test
  @DisplayName(
      "Counts and independent active member include facts beyond the loaded version/report page")
  void countsBeyondPages() {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome active = submit(OTHER, "0", "https://youtu.be/active", true);
    for (int index = 0; index < 24; index++) {
      sql.update(
          "INSERT INTO contribution_version(id,match_id,address,platform,state,created_at,quota_participating) VALUES (?,?,'https://youtu.be/history','YOUTUBE','REJECTED',?,FALSE)",
          new UUID(0, index + 100),
          matchId,
          Timestamp.from(NOW.plusSeconds(1)));
      sql.update(
          "INSERT INTO contribution_report(id,version_id,reason,reported_at) VALUES (?,?,NULL,?)",
          new UUID(0, index + 200),
          active.version().id(),
          Timestamp.from(NOW));
    }

    // When
    ReadModeration.Match first =
        moderation.read(OTHER, matchId, StreamVersionFilterEnum.HISTORICAL, 0);
    ReadModeration.Reports reports = moderation.reports(OTHER, matchId, active.version().id(), 0);

    // Then
    assertThat(first.items()).hasSize(20);
    assertThat(first.items().stream().map(item -> item.version().id())).isSorted();
    assertThat(first.nextPage()).isEqualTo(1);
    assertThat(first.activity().counts().rejected()).isEqualTo(24);
    assertThat(first.activity().counts().reports()).isEqualTo(24);
    assertThat(first.activeContribution().version().id()).isEqualTo(active.version().id());
    assertThat(moderation.read(OTHER, matchId, StreamVersionFilterEnum.HISTORICAL, 1).items())
        .hasSize(4);
    assertThat(reports.count()).isEqualTo(24);
    assertThat(reports.items()).hasSize(20).allMatch(report -> report.reason() == null);
    assertThat(reports.items()).extracting(ModerationStore.Report::id).isSorted();
    assertThat(reports.nextPage()).isEqualTo(1);
    assertThat(moderation.queue(OTHER, null, "", null, null, 0).items()).hasSize(1);
    assertThat(moderation.queue(OTHER, null, "", null, null, 0).items()).hasSize(1);
  }

  @Test
  @DisplayName(
      "Resolved holds exclude historical reports from badges while retaining exact history")
  void retainsHistoryAfterSelection() {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome source = submit(OTHER, "0", "https://youtu.be/source", true);
    sql.update("UPDATE contribution_version SET state='HIDDEN' WHERE id=?", source.version().id());
    sql.update(
        "UPDATE contribution_state SET report_hold_version_id=? WHERE match_id=?",
        source.version().id(),
        matchId);
    sql.update(
        "INSERT INTO contribution_report(id,version_id,reason,reported_at) VALUES (gen_random_uuid(),?,NULL,?)",
        source.version().id(),
        Timestamp.from(NOW));
    submit(OTHER, "1", "https://twitch.tv/selected", true);

    // When
    ReadModeration.Match detail = moderation.read(OTHER, matchId, null, 0);

    // Then
    assertThat(detail.activity().hold()).isFalse();
    assertThat(detail.activity().counts().hidden()).isZero();
    assertThat(detail.activity().counts().reports()).isZero();
    assertThat(moderation.reports(OTHER, matchId, source.version().id(), 0).count()).isEqualTo(1);
    assertThat(moderation.queue(OTHER, null, "", null, null, 0).items()).isEmpty();
  }

  @Test
  @DisplayName("More than twenty tied-activity roots stay distinct with bounded SQL hydration")
  void pagesDistinctMatchesWithoutNPlusOne() {
    // Given: retained root fixtures share valid F02 participants; no acquisition is qualified here.
    moderator(OTHER);
    submit(OTHER, "0", "https://youtu.be/first", true);
    for (int index = 0; index < 23; index++) {
      UUID root = new UUID(0, index + 1000);
      sql.update(
          "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,present) SELECT ?,pool_id,?,home_team_id,away_team_id,local_date,present FROM sporting_match WHERE id=?",
          root,
          "private-" + index,
          matchId);
      sql.update(
          "INSERT INTO contribution_version(id,match_id,address,platform,state,created_at,quota_participating) VALUES (gen_random_uuid(),?,'https://youtu.be/tied','YOUTUBE','PENDING',?,FALSE)",
          root,
          Timestamp.from(NOW));
    }
    org.hibernate.stat.Statistics statistics =
        entities
            .getEntityManagerFactory()
            .unwrap(org.hibernate.SessionFactory.class)
            .getStatistics();
    statistics.setStatisticsEnabled(true);
    statistics.clear();

    // When
    ReadModeration.Queue first =
        moderation.queue(OTHER, null, "", null, StreamModerationFilterEnum.ALL, 0);
    long statements = statistics.getPrepareStatementCount();
    ReadModeration.Queue second =
        moderation.queue(OTHER, null, "", null, StreamModerationFilterEnum.ALL, 1);

    // Then
    assertThat(first.items()).hasSize(20);
    assertThat(second.items()).hasSize(4);
    assertThat(first.items().stream().map(item -> item.match().id()))
        .doesNotContainAnyElementsOf(
            second.items().stream().map(item -> item.match().id()).toList());
    assertThat(first.items().stream().map(item -> item.match().id())).isSorted();
    assertThat(first.nextPage()).isEqualTo(1);
    assertThat(second.nextPage()).isNull();
    assertThat(statements)
        .as("One private page must hydrate sporting context in batches")
        .isLessThan(20);
    assertThat(first.seasons()).hasSize(1);
  }

  @Test
  @DisplayName("Unclassified hidden parents remain readable in private moderation")
  void readsUnclassifiedPrivateContext() {
    // Given
    moderator(OTHER);
    submit(OTHER, "0", "https://youtu.be/retained", true);
    sql.update(
        "UPDATE sporting_pool SET division_id=NULL,catalog_eligible=FALSE WHERE id=?",
        scope.pool());

    // When
    ReadModeration.Match privateMatch = moderation.read(OTHER, matchId, null, 0);

    // Then
    assertThat(privateMatch.match().publiclyViewable()).isFalse();
    assertThat(privateMatch.canPublish()).isFalse();
    assertThat(privateMatch.match().pool().classification().division()).isNull();
  }

  @Test
  @DisplayName(
      "Queue context and badges share one repeatable-read snapshot during a concurrent report")
  void keepsMultiQuerySnapshot() throws Exception {
    // Given: only scheduling at the page-selection boundary is controlled; SQL remains real.
    moderator(OTHER);
    SubmitContribution.Outcome active = submit(OTHER, "0", "https://youtu.be/active", true);
    try (java.util.concurrent.ExecutorService writer =
        java.util.concurrent.Executors.newSingleThreadExecutor()) {
      org.mockito.Mockito.doAnswer(
              invocation -> {
                ModerationStore.QueuePage page =
                    (ModerationStore.QueuePage) invocation.callRealMethod();
                writer
                    .submit(
                        () ->
                            sql.update(
                                "INSERT INTO contribution_report(id,version_id,reason,reported_at) VALUES (gen_random_uuid(),?,NULL,?)",
                                active.version().id(),
                                Timestamp.from(NOW)))
                    .get(15, java.util.concurrent.TimeUnit.SECONDS);
                return page;
              })
          .when(readStore)
          .queue(null, "", null, "ALL", 0);

      // When
      ReadModeration.Queue snapshot =
          moderation.queue(OTHER, null, "", null, StreamModerationFilterEnum.ALL, 0);

      // Then
      assertThat(snapshot.items())
          .singleElement()
          .satisfies(item -> assertThat(item.activity().counts().reports()).isZero());
      org.mockito.Mockito.doCallRealMethod().when(readStore).queue(null, "", null, "ALL", 0);
      assertThat(moderation.queue(OTHER, null, "", null, StreamModerationFilterEnum.ALL, 0).items())
          .singleElement()
          .satisfies(item -> assertThat(item.activity().counts().reports()).isEqualTo(1));
    }
  }
}
