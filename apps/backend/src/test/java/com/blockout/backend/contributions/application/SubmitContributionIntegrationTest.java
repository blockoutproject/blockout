package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.contributions.support.ContributionScenario;
import java.net.URI;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real submission and current-state persistence; time alone is controlled by the shared fixture.
 */
@DisplayName("Atomic contribution submission")
class SubmitContributionIntegrationTest extends ContributionScenario {

  @Test
  @DisplayName("An eligible ordinary submission publishes one quota-participating version")
  void publishesOrdinaryVersion() {
    // Given
    // The shared fixture confirms H at the controlled action instant.

    // When
    SubmitContribution.Outcome result =
        submissions.submit(
            AUTHOR, matchId, "0", URI.create("https://youtube.com/watch?v=synthetic"), false);

    // Then
    assertThat(result.version().state()).isEqualTo(ContributionVersion.State.ACTIVE);
    assertThat(result.version().quotaParticipating()).isTrue();
    assertThat(result.revision()).isEqualTo("1");
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM contribution_version", Long.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("An ordinary post-result submission remains pending without an announcement")
  void preservesPendingProposal() {
    // Given
    sql.update(
        "UPDATE sporting_match SET result_state='FINAL',home_sets=3,away_sets=1 WHERE id=?",
        matchId);

    // When
    SubmitContribution.Outcome result =
        submissions.submit(AUTHOR, matchId, "0", URI.create("https://twitch.tv/synthetic"), false);

    // Then
    assertThat(result.version().state()).isEqualTo(ContributionVersion.State.PENDING);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM match_announcement", Long.class)).isZero();
  }

  @Test
  @DisplayName("Third ordinary version is accepted and a fourth different address changes nothing")
  void enforcesLifetimeQuota() {
    // Given
    submit(AUTHOR, "0", "https://youtube.com/one", false);
    submit(AUTHOR, "1", "https://youtube.com/two", false);
    SubmitContribution.Outcome third = submit(AUTHOR, "2", "https://youtube.com/three", false);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> submit(AUTHOR, "3", "https://youtube.com/four", false));
    SubmitContribution.Outcome repeat = submit(AUTHOR, "3", "https://youtube.com/three", false);

    // Then
    assertThat(failure)
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            rejected ->
                assertThat(rejected.getStatus())
                    .isEqualTo(
                        com.blockout.backend.contributions.domain.ContributionEligibility.Status
                            .VERSION_LIMIT));
    assertThat(repeat.created()).isFalse();
    assertThat(repeat.version().id()).isEqualTo(third.version().id());
    assertThat(count("contribution_version")).isEqualTo(3);
    assertThat(reads.read(AUTHOR, matchId, 0).revision()).isEqualTo("3");
  }

  @Test
  @DisplayName("A stale unchanged submission is refused before duplicate recognition")
  void rejectsStaleNoop() {
    // Given
    submit(AUTHOR, "0", "https://youtube.com/one", false);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> submit(AUTHOR, "0", "https://youtube.com/one", false));

    // Then
    assertThat(failure)
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            rejected ->
                assertThat(rejected.getStatus())
                    .isEqualTo(
                        com.blockout.backend.contributions.domain.ContributionEligibility.Status
                            .STALE_REVISION));
    assertThat(count("contribution_version")).isEqualTo(1);
  }

  @Test
  @DisplayName("Refusing another owner preserves the public version and editing revision")
  void preservesForeignActiveVersion() {
    // Given
    SubmitContribution.Outcome original = submit(AUTHOR, "0", "https://youtube.com/one", false);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> submit(OTHER, "1", "https://twitch.tv/other", false));

    // Then
    assertThat(failure).isInstanceOf(ContributionRejectedException.class);
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(original.version().id());
    assertThat(count("contribution_version")).isEqualTo(1);
    assertThat(reads.read(AUTHOR, matchId, 0).revision()).isEqualTo("1");
  }

  @Test
  @DisplayName("A replacement pending after the result retains the authorized active link")
  void retainsActiveWhilePending() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtube.com/one", false);
    result(2, com.blockout.backend.generated.ingestion.model.ResultStateEnum.FINAL);

    // When
    SubmitContribution.Outcome first = submit(AUTHOR, "1", "https://youtube.com/two", false);
    SubmitContribution.Outcome second = submit(AUTHOR, "2", "https://youtube.com/three", false);

    // Then
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(active.version().id());
    assertThat(contributions.version(first.version().id()).orElseThrow().state())
        .isEqualTo(ContributionVersion.State.SUPERSEDED);
    assertThat(second.version().state()).isEqualTo(ContributionVersion.State.PENDING);
  }

  @Test
  @DisplayName(
      "A stream moderator supersedes proposals and resolves the hold with an exempt version")
  void publishesModeratorSelection() {
    // Given
    result(2, com.blockout.backend.generated.ingestion.model.ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "0", "https://youtube.com/one", false);
    moderator(OTHER);
    sql.update(
        "UPDATE contribution_state SET report_hold_version_id=? WHERE match_id=?",
        pending.version().id(),
        matchId);

    // When
    SubmitContribution.Outcome selected = submit(OTHER, "1", "https://twitch.tv/selected", true);

    // Then
    assertThat(selected.version().quotaParticipating()).isFalse();
    assertThat(selected.version().ownerId()).isEqualTo(OTHER);
    assertThat(contributions.version(pending.version().id()).orElseThrow().state())
        .isEqualTo(ContributionVersion.State.SUPERSEDED);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isNull();
    assertThat(reads.read(AUTHOR, matchId, 0).usage().versionsUsed()).isEqualTo(1);
  }

  @Test
  @DisplayName(
      "A fourth distinct Paris-day match is refused while same-match continuation remains allowed")
  void enforcesDailyQuota() {
    // Given: controlled lifecycle rows use the actual mapped writer; no quota counter exists.
    TransactionTemplate tx = new TransactionTemplate(transactions);
    tx.executeWithoutResult(
        status -> {
          for (int n = 0; n < 3; n++) {
            UUID id = UUID.randomUUID();
            sql.update(
                "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,reliable_start) SELECT ?,pool_id,?,home_team_id,away_team_id,local_date,reliable_start FROM sporting_match WHERE id=?",
                id,
                "quota-" + n,
                matchId);
            contributions.record(
                id, AUTHOR, new StreamAddress("https://youtube.com/" + n), false, false, NOW);
          }
        });

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> submit(AUTHOR, "0", "https://youtube.com/fourth", false));

    // Then
    assertThat(failure)
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            rejected ->
                assertThat(rejected.getStatus())
                    .isEqualTo(
                        com.blockout.backend.contributions.domain.ContributionEligibility.Status
                            .DAILY_MATCH_LIMIT));
    assertThat(count("contribution_version")).isEqualTo(3);
    UUID counted =
        sql.queryForObject(
            "SELECT match_id FROM contribution_version ORDER BY match_id LIMIT 1", UUID.class);
    submissions.submit(AUTHOR, counted, "0", URI.create("https://youtube.com/continued"), false);
    assertThat(count("contribution_version")).isEqualTo(4);
    assertThat(reads.read(AUTHOR, matchId, 0).usage().dailyMatchesUsed()).isEqualTo(3);
  }
}
