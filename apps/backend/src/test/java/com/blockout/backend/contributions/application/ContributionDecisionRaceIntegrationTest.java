package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

/** Actual report/selection exclusion on sporting roots, without retargeting or stale overwrites. */
@DisplayName("Contribution reporting and decision races")
class ContributionDecisionRaceIntegrationTest extends ContributionScenario {
  @Autowired private MatchContributionAccess sporting;
  @Autowired private ReportContribution reporting;
  @Autowired private ModerateContribution moderation;

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("The tenth report and a viewed approval serialize without transferring effects")
  void serializesReportAndApproval(boolean reportFirst) throws Exception {
    // Given
    SubmitContribution.Outcome source = submit(AUTHOR, "0", "https://youtu.be/viewed", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://twitch.tv/pending", false);
    for (int index = 1; index <= 10; index++) {
      UUID reporter = new UUID(0, index);
      sql.update(
          "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', ?, ?, 'synthetic@example.invalid')",
          reporter,
          reporter.toString(),
          "RaceReporter" + index);
      if (index < 10) reporting.report(reporter, source.version().id(), "Synthetic reason");
    }
    UUID lastReporter = new UUID(0, 10);
    moderator(OTHER);
    TransactionTemplate tx = new TransactionTemplate(transactions);
    CompletableFuture<Integer> blockedPid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<Throwable> waiting =
          tx.execute(
              transaction -> {
                sporting.lock(matchId);
                Future<Throwable> future =
                    worker.submit(
                        () ->
                            catchThrowable(
                                () ->
                                    tx.executeWithoutResult(
                                        inner -> {
                                          blockedPid.complete(
                                              sql.queryForObject(
                                                  "SELECT pg_backend_pid()", Integer.class));
                                          if (reportFirst)
                                            moderation.change(
                                                OTHER,
                                                matchId,
                                                pending.version().id(),
                                                "11",
                                                StreamModerationActionEnum.APPROVE);
                                          else
                                            reporting.report(
                                                lastReporter,
                                                source.version().id(),
                                                "Tenth reason");
                                        })));
                PostgresTestDatabase.awaitBlocked(sql, blockedPid);
                if (reportFirst)
                  reporting.report(lastReporter, source.version().id(), "Tenth reason");
                else
                  moderation.change(
                      OTHER,
                      matchId,
                      pending.version().id(),
                      "11",
                      StreamModerationActionEnum.APPROVE);
                return future;
              });

      Throwable failure = waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(contributions.state(matchId).revision()).isEqualTo(12);
      assertThat(count("contribution_version")).isEqualTo(2);
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM contribution_report WHERE version_id=?",
                  Long.class,
                  pending.version().id()))
          .isZero();
      assertThat(count("contribution_report")).isEqualTo(reportFirst ? 10 : 9);
      if (reportFirst) {
        assertThat(failure)
            .isInstanceOfSatisfying(
                ContributionRejectedException.class,
                refused -> assertThat(refused.getStatus()).isEqualTo(Status.STALE_REVISION));
        assertThat(contributions.active(matchId)).isEmpty();
        assertThat(contributions.state(matchId).reportHoldVersionId())
            .isEqualTo(source.version().id());
        assertThat(contributions.pending(matchId, AUTHOR).orElseThrow().id())
            .isEqualTo(pending.version().id());
        assertThat(contributions.version(source.version().id()).orElseThrow().state())
            .isEqualTo(State.HIDDEN);
      } else {
        assertThat(failure).isInstanceOf(ContributionConflictException.class);
        assertThat(contributions.active(matchId).orElseThrow().id())
            .isEqualTo(pending.version().id());
        assertThat(contributions.state(matchId).reportHoldVersionId()).isNull();
        assertThat(contributions.version(source.version().id()).orElseThrow().state())
            .isEqualTo(State.REPLACED);
      }
    }
  }
}
