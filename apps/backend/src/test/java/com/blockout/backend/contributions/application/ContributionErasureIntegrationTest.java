package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;

/** Real F08 commands and F05 erasure retain sporting facts while clearing personal attribution. */
@TestPropertySource(properties = "blockout.accounts.cleanup.environment=disabled")
@DisplayName("Contribution erasure integrity")
class ContributionErasureIntegrationTest extends ContributionScenario {
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private EraseAccount erasure;
  @Autowired private AccountStore accounts;
  @Autowired private ReportContribution reporting;
  @Autowired private ModerateContribution moderation;
  @MockitoSpyBean private AccountAccess locks;

  @Test
  @DisplayName(
      "Hidden facts, hold, pending versions and distinct report rows survive erased reporters")
  void retainsCountedFacts() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/facts", false);
    UUID third = UUID.fromString("00000000-0000-4000-8000-000000000004");
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, ?, ?, 'ThirdReporter', 'synthetic@example.invalid')",
        third,
        ISSUER,
        third.toString());
    reporting.report(FOLLOWER, active.version().id(), "Private first");
    reporting.report(OTHER, active.version().id(), "Private second");
    reporting.report(third, active.version().id(), "Private third");
    submit(AUTHOR, "4", "https://youtu.be/pending", false);
    submit(OTHER, "5", "https://youtu.be/other-pending", false);
    List<Map<String, Object>> before = facts();

    // When
    erasure.erase(ISSUER, AUTHOR.toString(), AUTHOR);
    erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);
    erasure.erase(ISSUER, OTHER.toString(), OTHER);

    // Then
    assertThat(facts()).isEqualTo(before);
    assertThat(contributions.version(active.version().id()).orElseThrow().state())
        .isEqualTo(State.HIDDEN);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(active.version().id());
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM contribution_report", Long.class))
        .isEqualTo(3);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_report WHERE reporter_id IS NULL AND reason IS NULL",
                Long.class))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE state='PENDING' AND owner_id IS NULL",
                Long.class))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT reason FROM contribution_report WHERE reporter_id=?", String.class, third))
        .isEqualTo("Private third");
  }

  @Test
  @DisplayName("Original owners and decision actors stay erased across lineage and registration")
  void retainsDecisionLineage() {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome source = submit(AUTHOR, "0", "https://youtu.be/source", false);
    moderation.change(
        OTHER, matchId, source.version().id(), "1", StreamModerationActionEnum.WITHDRAW);
    SubmitContribution.Outcome reactivated =
        moderation.reactivate(OTHER, matchId, source.version().id(), "2");
    List<Map<String, Object>> before = facts();

    // When
    erasure.erase(ISSUER, AUTHOR.toString(), AUTHOR);
    erasure.erase(ISSUER, OTHER.toString(), OTHER);
    UUID replacement =
        new TransactionTemplate(transactions)
            .execute(
                status ->
                    accounts
                        .create(
                            ISSUER,
                            AUTHOR.toString(),
                            "NewLifecycle",
                            "synthetic@example.invalid",
                            null)
                        .id());

    // Then
    assertThat(facts()).isEqualTo(before);
    assertThat(contributions.version(reactivated.version().id()).orElseThrow().sourceVersionId())
        .isEqualTo(source.version().id());
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE owner_id IS NOT NULL OR publication_actor_id IS NOT NULL OR decision_actor_id IS NOT NULL",
                Long.class))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE owner_id=?",
                Long.class,
                replacement))
        .isZero();
  }

  @ParameterizedTest
  @ValueSource(strings = {"submission", "report", "reactivation"})
  @DisplayName(
      "A writer holding sporting roots rechecks erased identity before attribution effects")
  void rechecksAfterErasure(String operation) throws Exception {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome source = submit(AUTHOR, "0", "https://youtu.be/source", false);
    if (operation.equals("reactivation"))
      moderation.change(
          OTHER, matchId, source.version().id(), "1", StreamModerationActionEnum.WITHDRAW);
    UUID erased = operation.equals("reactivation") ? AUTHOR : FOLLOWER;
    CompletableFuture<Void> beforeAccount = new CompletableFuture<>();
    CompletableFuture<Void> proceed = new CompletableFuture<>();
    doAnswer(
            call -> {
              beforeAccount.complete(null);
              proceed.get(10, TimeUnit.SECONDS);
              return call.callRealMethod();
            })
        .when(
            org.springframework.test.util.AopTestUtils.<AccountAccess>getUltimateTargetObject(
                locks))
        .lock(erased);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> writing =
          workers.submit(
              () -> {
                switch (operation) {
                  case "submission" -> submit(FOLLOWER, "1", "https://youtu.be/late", false);
                  case "report" ->
                      reporting.report(FOLLOWER, source.version().id(), "Private late report");
                  case "reactivation" ->
                      moderation.reactivate(OTHER, matchId, source.version().id(), "2");
                  default -> throw new IllegalArgumentException(operation);
                }
              });
      beforeAccount.get(10, TimeUnit.SECONDS);

      // When: erasure must finish while the real writer still holds its sporting roots.
      workers
          .submit(() -> erasure.erase(ISSUER, erased.toString(), erased))
          .get(10, TimeUnit.SECONDS);
      proceed.complete(null);

      // Then
      if (operation.equals("reactivation")) {
        writing.get(10, TimeUnit.SECONDS);
        assertThat(contributions.active(matchId).orElseThrow().ownerId()).isNull();
        assertThat(contributions.active(matchId).orElseThrow().sourceVersionId())
            .isEqualTo(source.version().id());
      } else {
        assertThatThrownBy(() -> writing.get(10, TimeUnit.SECONDS))
            .hasCauseInstanceOf(AccountNotFoundException.class);
        assertThat(count("contribution_report")).isZero();
      }
      assertThat(accounts.findById(erased)).isEmpty();
    } finally {
      proceed.complete(null);
    }
  }

  /**
   * Reads the nonpersonal version facts whose values and activity must survive attribution erasure.
   *
   * @return ordered retained state, quota, chronology, decision and lineage values
   */
  private List<Map<String, Object>> facts() {
    return sql.queryForList(
        "SELECT id, match_id, address, platform, state, created_at, quota_participating, source_version_id, replaced_by_version_id, publication_kind, publication_at, decision_kind, decision_at FROM contribution_version ORDER BY id");
  }
}
