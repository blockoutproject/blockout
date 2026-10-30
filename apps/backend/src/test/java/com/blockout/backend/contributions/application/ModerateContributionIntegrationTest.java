package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

/** Real moderation commands over migrated PostgreSQL and current F02/F05/F07/F12 owners. */
@DisplayName("Exact contribution moderation")
class ModerateContributionIntegrationTest extends ContributionScenario {
  @Autowired private ModerateContribution moderation;
  @Autowired private AccountAccess accountLocks;

  @Test
  @DisplayName("Approval retains the owner and supersedes every alternative")
  void selectsExistingProposal() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome selected = submit(AUTHOR, "1", "https://twitch.tv/selected", false);
    java.util.UUID alternative = java.util.UUID.randomUUID();
    sql.update(
        "INSERT INTO contribution_version(id,match_id,address,platform,owner_id,state,created_at,quota_participating) VALUES (?,?,'https://youtu.be/other','YOUTUBE',?,'PENDING',?,TRUE)",
        alternative,
        matchId,
        FOLLOWER,
        java.sql.Timestamp.from(NOW));
    moderator(OTHER);

    // When
    SubmitContribution.Outcome approved =
        moderation.change(
            OTHER, matchId, selected.version().id(), "2", StreamModerationActionEnum.APPROVE);

    // Then
    assertThat(approved.version().id()).isEqualTo(selected.version().id());
    assertThat(approved.version().ownerId()).isEqualTo(AUTHOR);
    assertThat(approved.version().quotaParticipating()).isTrue();
    assertThat(approved.version().publication().actorId()).isEqualTo(OTHER);
    assertThat(contributions.version(active.version().id()).orElseThrow().replacedByVersionId())
        .isEqualTo(selected.version().id());
    assertThat(contributions.version(alternative).orElseThrow().state())
        .isEqualTo(State.SUPERSEDED);
    assertThat(contributions.state(matchId).revision()).isEqualTo(3);
  }

  @ParameterizedTest
  @EnumSource(
      value = State.class,
      names = {"REJECTED", "WITHDRAWN", "HIDDEN", "REPLACED", "SUPERSEDED"})
  @DisplayName("Reactivation creates an exempt source-linked version without inherited reports")
  void reactivatesHistoricalSource(State historical) {
    // Given: retained history is a fixture, not qualification of the erasure orchestrator.
    SubmitContribution.Outcome source =
        submit(AUTHOR, "0", "https://youtu.be/source?literal=1#time", false);
    sql.update(
        "UPDATE contribution_version SET state=? WHERE id=?",
        historical.name(),
        source.version().id());
    sql.update(
        "INSERT INTO contribution_report(id,version_id,reporter_id,reason,reported_at) VALUES (gen_random_uuid(),?,NULL,NULL,?)",
        source.version().id(),
        java.sql.Timestamp.from(NOW));
    moderator(OTHER);

    // When
    SubmitContribution.Outcome reactivated =
        moderation.reactivate(OTHER, matchId, source.version().id(), "1");

    // Then
    assertThat(reactivated.created()).isTrue();
    assertThat(reactivated.version().id()).isNotEqualTo(source.version().id());
    assertThat(reactivated.version().address()).isEqualTo(source.version().address());
    assertThat(reactivated.version().ownerId()).isEqualTo(AUTHOR);
    assertThat(reactivated.version().sourceVersionId()).isEqualTo(source.version().id());
    assertThat(reactivated.version().quotaParticipating()).isFalse();
    assertThat(contributions.version(source.version().id()).orElseThrow().state())
        .isEqualTo(historical);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_report WHERE version_id=?",
                Long.class,
                reactivated.version().id()))
        .isZero();
    assertThatThrownBy(() -> moderation.reactivate(OTHER, matchId, source.version().id(), "1"))
        .isInstanceOf(ContributionRejectedException.class);
    assertThat(count("contribution_version")).isEqualTo(2);
  }

  @Test
  @DisplayName("Rejection preserves the independent hold and active version")
  void rejectsOnlyProposal() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://youtu.be/pending", false);
    sql.update(
        "UPDATE contribution_state SET report_hold_version_id=? WHERE match_id=?",
        active.version().id(),
        matchId);
    moderator(OTHER);

    // When
    moderation.change(
        OTHER, matchId, pending.version().id(), "2", StreamModerationActionEnum.REJECT);

    // Then
    assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(active.version());
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(active.version().id());
    assertThat(
            moderation
                .change(
                    OTHER, matchId, pending.version().id(), "3", StreamModerationActionEnum.REJECT)
                .revision())
        .isEqualTo("3");
    assertThatThrownBy(
            () ->
                moderation.change(
                    OTHER, matchId, pending.version().id(), "2", StreamModerationActionEnum.REJECT))
        .isInstanceOf(ContributionRejectedException.class);
  }

  @Test
  @DisplayName("Private handling permits withdrawal but never publishes a hidden match")
  void respectsSportingRestrictions() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    moderator(OTHER);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);

    // When
    moderation.change(
        OTHER, matchId, active.version().id(), "1", StreamModerationActionEnum.WITHDRAW);

    // Then
    assertThatThrownBy(() -> moderation.reactivate(OTHER, matchId, active.version().id(), "2"))
        .isInstanceOf(ContributionRejectedException.class);
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(contributions.version(active.version().id()).orElseThrow().publication())
        .isEqualTo(active.version().publication());
  }

  @Test
  @DisplayName("Reactivation waits for F05 erasure locking and rereads the historical owner")
  void rereadsOwnerAfterErasureLock() throws Exception {
    // Given: the real F05 lock coordinates a controlled local deletion, not its later orchestrator.
    SubmitContribution.Outcome source = submit(AUTHOR, "0", "https://youtu.be/source", false);
    sql.update(
        "UPDATE contribution_version SET state='WITHDRAWN' WHERE id=?", source.version().id());
    moderator(OTHER);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<SubmitContribution.Outcome> pending =
          tx.execute(
              status -> {
                assertThat(accountLocks.lock(AUTHOR)).isTrue();
                Future<SubmitContribution.Outcome> future =
                    worker.submit(
                        () ->
                            tx.execute(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return moderation.reactivate(
                                      OTHER, matchId, source.version().id(), "1");
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                assertThat(future.isDone()).isFalse();
                sql.update("DELETE FROM account WHERE id=?", AUTHOR);
                return future;
              });

      // When
      SubmitContribution.Outcome accepted = pending.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(accepted.version().ownerId()).isNull();
      assertThat(contributions.version(accepted.version().id()).orElseThrow().ownerId()).isNull();
      assertThat(accepted.version().sourceVersionId()).isEqualTo(source.version().id());
    }
  }

  @Test
  @DisplayName("Current moderation grant is reread after the original actor account lock")
  void rereadsGrantAfterLock() throws Exception {
    // Given
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "0", "https://youtu.be/pending", false);
    moderator(OTHER);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<Throwable> waiting =
          tx.execute(
              status -> {
                assertThat(accountLocks.lock(OTHER)).isTrue();
                Future<Throwable> future =
                    worker.submit(
                        () ->
                            org.assertj.core.api.Assertions.catchThrowable(
                                () ->
                                    tx.execute(
                                        inner -> {
                                          pid.complete(
                                              sql.queryForObject(
                                                  "SELECT pg_backend_pid()", Integer.class));
                                          return moderation.change(
                                              OTHER,
                                              matchId,
                                              pending.version().id(),
                                              "1",
                                              StreamModerationActionEnum.APPROVE);
                                        })));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                sql.update("DELETE FROM account_permission WHERE account_id=?", OTHER);
                return future;
              });

      // When
      Throwable failure = waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(failure)
          .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
      assertThat(contributions.version(pending.version().id()).orElseThrow().state())
          .isEqualTo(State.PENDING);
      assertThat(contributions.state(matchId).revision()).isEqualTo(1);
    }
  }

  @Test
  @DisplayName("Concurrent decisions cannot overwrite the first committed revision")
  void serializesDecisions() throws Exception {
    // Given
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "0", "https://youtu.be/pending", false);
    moderator(OTHER);
    java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      java.util.List<Future<Throwable>> outcomes = new java.util.ArrayList<>();
      for (StreamModerationActionEnum action :
          java.util.List.of(StreamModerationActionEnum.APPROVE, StreamModerationActionEnum.REJECT))
        outcomes.add(
            workers.submit(
                () -> {
                  start.await();
                  return org.assertj.core.api.Assertions.catchThrowable(
                      () -> moderation.change(OTHER, matchId, pending.version().id(), "1", action));
                }));

      // When
      start.countDown();
      java.util.List<Throwable> results = new java.util.ArrayList<>();
      for (Future<Throwable> outcome : outcomes) results.add(outcome.get(15, TimeUnit.SECONDS));

      // Then
      assertThat(results.stream().filter(java.util.Objects::isNull)).hasSize(1);
      assertThat(results.stream().filter(java.util.Objects::nonNull))
          .singleElement()
          .isInstanceOf(ContributionRejectedException.class);
      assertThat(contributions.state(matchId).revision()).isEqualTo(2);
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM contribution_version WHERE match_id=? AND state='ACTIVE'",
                  Long.class,
                  matchId))
          .isLessThanOrEqualTo(1L);
    }
  }

  @ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
  @DisplayName("Required real F07 inbox failure rolls approval and every version effect back")
  void rollsBackRequiredAnnouncement(boolean reactivation) {
    // Given
    result(2, ResultStateEnum.FINAL);
    follow(FOLLOWER);
    SubmitContribution.Outcome pending = submit(AUTHOR, "0", "https://youtu.be/pending", false);
    moderator(OTHER);
    if (reactivation)
      sql.update(
          "UPDATE contribution_version SET state='REJECTED' WHERE id=?", pending.version().id());
    sql.update(
        "INSERT INTO notification(id,account_id,match_id,family,variant,created_at,is_read) VALUES (?,?,?,'POST_RESULT_LINK','FIRST',?,FALSE)",
        java.util.UUID.randomUUID(),
        FOLLOWER,
        matchId,
        java.sql.Timestamp.from(NOW));

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> {
              if (reactivation) moderation.reactivate(OTHER, matchId, pending.version().id(), "1");
              else
                moderation.change(
                    OTHER,
                    matchId,
                    pending.version().id(),
                    "1",
                    StreamModerationActionEnum.APPROVE);
            });

    // Then
    assertThat(failure).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    assertThat(contributions.version(pending.version().id()).orElseThrow().state())
        .isEqualTo(reactivation ? State.REJECTED : State.PENDING);
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(count("contribution_version")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isFalse();
  }

  @ParameterizedTest
  @EnumSource(
      value = State.class,
      names = {"ACTIVE", "PENDING", "CANCELLED"})
  @DisplayName("Active pending and cancelled versions cannot be reactivation sources")
  void refusesIneligibleSource(State state) {
    // Given
    SubmitContribution.Outcome source = submit(AUTHOR, "0", "https://youtu.be/source", false);
    sql.update(
        "UPDATE contribution_version SET state=? WHERE id=?", state.name(), source.version().id());
    moderator(OTHER);

    // When: attempt the forbidden historical-source transition.
    // Then: the transaction rejects it without creating a version.
    assertThatThrownBy(() -> moderation.reactivate(OTHER, matchId, source.version().id(), "1"))
        .isInstanceOf(ContributionConflictException.class);
    assertThat(count("contribution_version")).isEqualTo(1);
  }
}
