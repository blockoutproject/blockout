package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.generated.mobile.model.StreamOwnerActionEnum;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Qualifies actual report, personal and moderation commands together over migrated PostgreSQL.
 * Sporting acquisition and principal authentication remain fixture inputs; no provider is called.
 */
@DisplayName("Integrated contribution lifecycle and quota qualification")
class ContributionLifecycleQualificationIntegrationTest extends ContributionScenario {
  private static final UUID THIRD_REPORTER =
      UUID.fromString("00000000-0000-4000-8000-000000000004");
  @Autowired private ReportContribution reporting;
  @Autowired private ModerateContribution moderation;
  @Autowired private ChangeOwnContribution changes;
  @Autowired private ReadModeration privateReads;
  @Autowired private ReadPublicContribution publicLinks;

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Cancelling or rejecting a real held proposal preserves its hold and consumed slots")
  void retainsHoldAfterNegativeDecision(boolean rejected) {
    // Given
    SubmitContribution.Outcome original = submit(AUTHOR, "0", "https://youtu.be/hidden", false);
    reportToHide(original.version().id());
    ContributionVersion hidden = contributions.version(original.version().id()).orElseThrow();
    SubmitContribution.Outcome pending = submit(AUTHOR, "4", "https://twitch.tv/pending", false);
    moderator(OTHER);

    // When
    if (rejected) {
      moderation.change(
          OTHER, matchId, pending.version().id(), "5", StreamModerationActionEnum.REJECT);
    } else {
      changes.change(AUTHOR, matchId, pending.version().id(), "5", StreamOwnerActionEnum.CANCEL);
    }
    SubmitContribution.Outcome third = submit(AUTHOR, "6", "https://facebook.com/third", false);

    // Then
    assertThat(contributions.version(original.version().id()).orElseThrow()).isEqualTo(hidden);
    assertThat(contributions.version(pending.version().id()).orElseThrow().state())
        .isEqualTo(rejected ? State.REJECTED : State.CANCELLED);
    assertThat(third.version().state()).isEqualTo(State.PENDING);
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow().id())
        .isEqualTo(third.version().id());
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(hidden.id());
    assertThat(publicLinks.read(matchId)).isEmpty();
    assertThat(reads.read(AUTHOR, matchId, 0).usage().versionsUsed()).isEqualTo(3);
    assertThatThrownBy(() -> submit(AUTHOR, "7", "https://youtu.be/fourth", false))
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            failure -> assertThat(failure.getStatus()).isEqualTo(Status.VERSION_LIMIT));
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow().id())
        .isEqualTo(third.version().id());
    assertThat(contributions.state(matchId).revision()).isEqualTo(7);
  }

  @ParameterizedTest
  @CsvSource({
    "APPROVE,false",
    "REACTIVATE,false",
    "PUBLISH,false",
    "APPROVE,true",
    "REACTIVATE,true",
    "PUBLISH,true"
  })
  @DisplayName(
      "Actual moderator selection resolves the report hold while preserving sporting approval")
  void resolvesHoldWithoutWaivingPostResultApproval(Selection selection, boolean postResult) {
    // Given
    SubmitContribution.Outcome original = submit(AUTHOR, "0", "https://youtu.be/source", false);
    reportToHide(original.version().id());
    ContributionVersion hidden = contributions.version(original.version().id()).orElseThrow();
    if (postResult) {
      result(2, ResultStateEnum.FINAL);
    }
    SubmitContribution.Outcome proposed = submit(AUTHOR, "4", "https://twitch.tv/proposed", false);
    SubmitContribution.Outcome alternative =
        submit(FOLLOWER, "5", "https://facebook.com/alternative", false);
    moderator(OTHER);

    // When
    SubmitContribution.Outcome selected =
        switch (selection) {
          case APPROVE ->
              moderation.change(
                  OTHER, matchId, proposed.version().id(), "6", StreamModerationActionEnum.APPROVE);
          case REACTIVATE -> moderation.reactivate(OTHER, matchId, original.version().id(), "6");
          case PUBLISH -> submit(OTHER, "6", "https://youtu.be/moderator", true);
        };

    // Then
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(selected.version().id());
    assertThat(contributions.state(matchId).reportHoldVersionId()).isNull();
    assertThat(contributions.version(original.version().id()).orElseThrow()).isEqualTo(hidden);
    assertThat(contributions.version(alternative.version().id()).orElseThrow().state())
        .isEqualTo(State.SUPERSEDED);
    assertThat(contributions.pending(matchId, AUTHOR)).isEmpty();
    assertThat(contributions.pending(matchId, FOLLOWER)).isEmpty();
    assertThat(privateReads.reports(OTHER, matchId, hidden.id(), 0).count()).isEqualTo(3);
    assertThat(privateReads.read(OTHER, matchId, null, 0).activity().counts().reports()).isZero();
    assertThat(reads.read(AUTHOR, matchId, 0).usage().versionsUsed()).isEqualTo(2);
    assertThat(reads.read(FOLLOWER, matchId, 0).usage().versionsUsed()).isEqualTo(1);
    if (selection == Selection.APPROVE) {
      assertThat(selected.version().id()).isEqualTo(proposed.version().id());
      assertThat(selected.version().quotaParticipating()).isTrue();
    } else {
      assertThat(selected.version().quotaParticipating()).isFalse();
      assertThat(contributions.version(proposed.version().id()).orElseThrow().state())
          .isEqualTo(State.SUPERSEDED);
    }
    if (selection == Selection.REACTIVATE) {
      assertThat(selected.version().sourceVersionId()).isEqualTo(hidden.id());
    }

    // Given: remove only the direct publisher's controlled grant before their ordinary submission.
    if (selection == Selection.PUBLISH) {
      sql.update("DELETE FROM account_permission WHERE account_id=?", OTHER);
    }
    UUID owner = selected.version().ownerId();

    // When
    SubmitContribution.Outcome next =
        submit(owner, selected.revision(), "https://youtu.be/ordinary-after-selection", false);

    // Then
    assertThat(next.version().state()).isEqualTo(postResult ? State.PENDING : State.ACTIVE);
    assertThat(next.version().quotaParticipating()).isTrue();
    assertThat(contributions.state(matchId).reportHoldVersionId()).isNull();
    if (postResult) {
      assertThat(contributions.active(matchId).orElseThrow().id())
          .isEqualTo(selected.version().id());
    } else {
      assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(next.version().id());
    }
  }

  @Test
  @DisplayName(
      "A former reporter reports a reactivated version once without changing source reports")
  void separatesReactivatedReports() {
    // Given
    SubmitContribution.Outcome original =
        submit(AUTHOR, "0", "https://youtu.be/source?literal=1#time", false);
    reportToHide(original.version().id());
    moderator(OTHER);
    SubmitContribution.Outcome selected =
        moderation.reactivate(OTHER, matchId, original.version().id(), "4");
    assertThat(privateReads.reports(OTHER, matchId, selected.version().id(), 0).count()).isZero();

    // When
    boolean created = reporting.report(FOLLOWER, selected.version().id(), "New version reason");
    boolean repeated = reporting.report(FOLLOWER, selected.version().id(), "Changed reason");
    boolean historicalRepeat =
        reporting.report(FOLLOWER, original.version().id(), "Changed old reason");

    // Then
    assertThat(created).isTrue();
    assertThat(repeated).isFalse();
    assertThat(historicalRepeat).isFalse();
    assertThat(privateReads.reports(OTHER, matchId, original.version().id(), 0).count())
        .isEqualTo(3);
    ReadModeration.Reports current =
        privateReads.reports(OTHER, matchId, selected.version().id(), 0);
    assertThat(current.count()).isEqualTo(1);
    assertThat(current.items())
        .extracting(ModerationStore.Report::reason)
        .containsExactly("New version reason");
    assertThat(contributions.state(matchId).revision()).isEqualTo(6);
    assertThatThrownBy(() -> moderation.reactivate(OTHER, matchId, original.version().id(), "4"))
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            failure -> assertThat(failure.getStatus()).isEqualTo(Status.STALE_REVISION));
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(selected.version().id());
    assertThat(count("contribution_version")).isEqualTo(2);
    assertThat(privateReads.reports(OTHER, matchId, selected.version().id(), 0).count())
        .isEqualTo(1);
  }

  @Test
  @DisplayName(
      "Real decisions and grant changes preserve exhausted ordinary lifetime and day usage")
  void preservesQuotaThroughDecisionsAndGrants() {
    // Given
    SubmitContribution.Outcome initial = submit(AUTHOR, "0", "https://youtu.be/initial", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome superseded = submit(AUTHOR, "1", "https://twitch.tv/second", false);
    SubmitContribution.Outcome pending = submit(AUTHOR, "2", "https://facebook.com/third", false);
    UUID secondMatch = UUID.fromString("00000000-0000-4000-8000-000000002810");
    UUID thirdMatch = UUID.fromString("00000000-0000-4000-8000-000000002811");
    addMatch(secondMatch, "quota-second");
    addMatch(thirdMatch, "quota-third");
    submissions.submit(
        AUTHOR, secondMatch, "0", URI.create("https://youtu.be/second-match"), false);
    submissions.submit(AUTHOR, thirdMatch, "0", URI.create("https://youtu.be/third-match"), false);
    ContributionQuota.Usage exhausted = new ContributionQuota.Usage(3, 3, true);
    assertThat(reads.read(AUTHOR, matchId, 0).usage()).isEqualTo(exhausted);
    moderator(OTHER);

    // When
    SubmitContribution.Outcome repeatedActive =
        submit(AUTHOR, "3", initial.version().address().value(), false);
    SubmitContribution.Outcome repeatedPending =
        submit(AUTHOR, "3", pending.version().address().value(), false);
    moderation.change(
        OTHER, matchId, pending.version().id(), "3", StreamModerationActionEnum.APPROVE);
    changes.change(AUTHOR, matchId, pending.version().id(), "4", StreamOwnerActionEnum.WITHDRAW);
    SubmitContribution.Outcome reactivated =
        moderation.reactivate(OTHER, matchId, pending.version().id(), "5");

    // Then
    assertThat(repeatedActive.created()).isFalse();
    assertThat(repeatedActive.version().id()).isEqualTo(initial.version().id());
    assertThat(repeatedPending.created()).isFalse();
    assertThat(repeatedPending.version().id()).isEqualTo(pending.version().id());
    assertThat(reactivated.version().quotaParticipating()).isFalse();
    assertThat(reactivated.version().sourceVersionId()).isEqualTo(pending.version().id());
    assertThat(reads.read(AUTHOR, matchId, 0).usage()).isEqualTo(exhausted);
    assertThat(reads.read(OTHER, matchId, 0).usage())
        .isEqualTo(new ContributionQuota.Usage(0, 0, false));

    // Given: F12 assigns grants directly in PostgreSQL; there is no grant-management endpoint.
    moderator(AUTHOR);

    // When
    SubmitContribution.Outcome direct = submit(AUTHOR, "6", "https://youtu.be/exempt", true);
    sql.update("DELETE FROM account_permission WHERE account_id=?", AUTHOR);
    SubmitContribution.Outcome repeatedExempt =
        submit(AUTHOR, "7", "https://youtu.be/exempt", false);

    // Then
    assertThat(direct.version().quotaParticipating()).isFalse();
    assertThat(repeatedExempt.created()).isFalse();
    assertThat(repeatedExempt.version().id()).isEqualTo(direct.version().id());
    assertThat(reads.read(AUTHOR, matchId, 0).usage()).isEqualTo(exhausted);
    for (UUID version :
        List.of(initial.version().id(), superseded.version().id(), pending.version().id())) {
      assertThat(contributions.version(version).orElseThrow().quotaParticipating()).isTrue();
    }
    assertThatThrownBy(() -> submit(AUTHOR, "7", "https://youtu.be/refused", false))
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            failure -> assertThat(failure.getStatus()).isEqualTo(Status.VERSION_LIMIT));
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(direct.version().id());
    assertThat(contributions.state(matchId).revision()).isEqualTo(7);
    assertThat(reads.read(AUTHOR, matchId, 0).usage()).isEqualTo(exhausted);
  }

  /**
   * Hides the supplied active version through three real distinct reports, retaining first reasons.
   *
   * @param version exact active version owned by AUTHOR at the ordinary pre-result threshold
   */
  private void reportToHide(UUID version) {
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', ?, 'ThirdReporter281', 'synthetic@example.invalid')",
        THIRD_REPORTER,
        THIRD_REPORTER.toString());
    assertThat(reporting.report(FOLLOWER, version, "First source reason")).isTrue();
    assertThat(reporting.report(OTHER, version, "Second source reason")).isTrue();
    assertThat(reporting.report(THIRD_REPORTER, version, "Third source reason")).isTrue();
    assertThat(contributions.version(version).orElseThrow().state()).isEqualTo(State.HIDDEN);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(version);
  }

  /**
   * Adds an eligible sporting fixture for a separate actual submission, without qualifying
   * ingestion.
   *
   * @param id stable distinct match identity
   * @param reference distinct source reference inside the existing admitted pool
   */
  private void addMatch(UUID id, String reference) {
    sql.update(
        "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,reliable_start) SELECT ?,pool_id,?,home_team_id,away_team_id,local_date,reliable_start FROM sporting_match WHERE id=?",
        id,
        reference,
        matchId);
  }

  /**
   * Complete current moderator selections that resolve an existing report-related approval wait.
   */
  private enum Selection {
    APPROVE,
    REACTIVATE,
    PUBLISH
  }
}
