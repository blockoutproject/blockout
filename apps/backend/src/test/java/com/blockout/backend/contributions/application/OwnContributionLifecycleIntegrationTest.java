package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;

/** Real generated HTTP commands, account/sporting owners and migrated PostgreSQL lifecycle. */
@AutoConfigureMockMvc
@DisplayName("Own contribution lifecycle")
class OwnContributionLifecycleIntegrationTest extends ContributionScenario {
  @Autowired private MockMvc mvc;
  @Autowired private ChangeOwnContribution changes;
  @Autowired private ReadPublicContribution publicLinks;

  @Test
  @DisplayName("The retired cancellation action cannot change a proposal or its consumed quota")
  void rejectsRetiredCancellation() throws Exception {
    // Given
    SubmitContribution.Outcome active =
        submit(AUTHOR, "0", "https://youtu.be/active?exact=1#time", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://twitch.tv/proposal", false);

    // When
    ResultActions response = change(AUTHOR, pending.version().id(), "2", "cancel");

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(active.version());
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow()).isEqualTo(pending.version());
    assertThat(reads.read(AUTHOR, matchId, 0).usage().versionsUsed()).isEqualTo(2);
    assertThat(contributions.state(matchId).revision()).isEqualTo(2);
  }

  @Test
  @DisplayName("Withdrawal leaves the pending proposal untouched without publishing it")
  void withdrawsOnlyActive() throws Exception {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://twitch.tv/proposal", false);

    // When
    ResultActions response = change(AUTHOR, active.version().id(), "2", "withdraw");

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(jsonPath("$.contribution.state").value("withdrawn"));
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(publicLinks.read(matchId)).isEmpty();
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow()).isEqualTo(pending.version());
    ContributionVersion withdrawn = contributions.version(active.version().id()).orElseThrow();
    assertThat(withdrawn.publication()).isEqualTo(active.version().publication());
    assertThat(withdrawn.address()).isEqualTo(active.version().address());
    assertThat(withdrawn.quotaParticipating()).isTrue();
    assertThat(withdrawn.decision().kind()).isEqualTo(ContributionVersion.DecisionKind.WITHDRAWAL);
    assertThat(reads.read(AUTHOR, matchId, 0).usage().versionsUsed()).isEqualTo(2);
  }

  @Test
  @DisplayName("Withdrawal ignores the publication window and exhausted version quota")
  void withdrawsWithoutSubmissionConditions() throws Exception {
    // Given
    submit(AUTHOR, "0", "https://youtu.be/first", false);
    submit(AUTHOR, "1", "https://youtu.be/second", false);
    SubmitContribution.Outcome active = submit(AUTHOR, "2", "https://youtu.be/third", false);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(86400)),
        matchId);

    // When
    ResultActions response = change(AUTHOR, active.version().id(), "3", "withdraw");

    // Then
    response.andExpect(status().isOk());
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(reads.read(AUTHOR, matchId, 0).usage().versionsUsed()).isEqualTo(3);
  }

  @ParameterizedTest
  @EnumSource(
      value = State.class,
      names = {"PENDING", "REJECTED", "SUPERSEDED", "HIDDEN", "REPLACED", "CANCELLED"})
  @DisplayName("An incompatible exact target conflicts without changing its lifecycle")
  void conflictsOnIncompatibleState(State state) throws Exception {
    // Given: historical decision fixtures do not implement or qualify moderator commands.
    moderator(AUTHOR);
    SubmitContribution.Outcome version = submit(AUTHOR, "0", "https://youtu.be/version", true);
    sql.update(
        "UPDATE contribution_version SET state=? WHERE id=?", state.name(), version.version().id());

    // When
    ResultActions response = change(AUTHOR, version.version().id(), "1", "withdraw");

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"));
    assertThat(contributions.version(version.version().id()).orElseThrow().state())
        .isEqualTo(state);
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName("Only a current revision repeats an exact terminal target without new effects")
  void repeatsExactTerminalTarget() throws Exception {
    // Given
    SubmitContribution.Outcome original = submit(AUTHOR, "0", "https://youtu.be/original", false);
    change(AUTHOR, original.version().id(), "1", "withdraw").andExpect(status().isOk());
    ContributionVersion completed = contributions.version(original.version().id()).orElseThrow();
    SubmitContribution.Outcome replacement =
        submit(AUTHOR, "2", "https://youtu.be/replacement", false);

    // When
    ResultActions stale = change(AUTHOR, original.version().id(), "1", "withdraw");
    ResultActions repeated = change(AUTHOR, original.version().id(), "3", "withdraw");

    // Then
    stale
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));
    repeated.andExpect(status().isOk()).andExpect(jsonPath("$.revision").value("3"));
    assertThat(contributions.version(original.version().id()).orElseThrow()).isEqualTo(completed);
    assertThat(completed.state()).isEqualTo(State.WITHDRAWN);
    assertThat(contributions.version(replacement.version().id()).orElseThrow())
        .isEqualTo(replacement.version());
    assertThat(contributions.state(matchId).revision()).isEqualTo(3);
  }

  @Test
  @DisplayName("A result withdrawal alone preserves both versions before eligible third submission")
  void replacesAfterResultWithdrawal() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://youtu.be/pending", false);

    // When
    result(3, null);

    // Then
    assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(active.version());
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow()).isEqualTo(pending.version());

    // When
    SubmitContribution.Outcome third = submit(AUTHOR, "2", "https://youtu.be/third", false);

    // Then
    assertThat(third.version().state()).isEqualTo(State.ACTIVE);
    assertThat(contributions.version(active.version().id()).orElseThrow().state())
        .isEqualTo(State.REPLACED);
    assertThat(contributions.version(pending.version().id()).orElseThrow().state())
        .isEqualTo(State.SUPERSEDED);
    assertThat(contributions.pending(matchId, AUTHOR)).isEmpty();
  }

  @Test
  @DisplayName("A rescheduled closed window preserves the active and pending versions on refusal")
  void preservesBothOnRefusedCorrection() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://youtu.be/pending", false);
    result(3, null);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        Timestamp.from(NOW.plusSeconds(7200)),
        matchId);

    // When / Then
    assertThatThrownBy(() -> submit(AUTHOR, "2", "https://youtu.be/refused", false))
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            failure -> assertThat(failure.getStatus()).isEqualTo(Status.WINDOW_NOT_OPEN));
    assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(active.version());
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow()).isEqualTo(pending.version());
    assertThat(contributions.state(matchId).revision()).isEqualTo(2);
  }

  @Test
  @DisplayName("A retained report wait keeps the corrected third submission pending")
  void keepsCorrectedProposalPendingUnderHold() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://youtu.be/pending", false);
    sql.update("UPDATE contribution_version SET state='HIDDEN' WHERE id=?", active.version().id());
    sql.update(
        "UPDATE contribution_state SET report_hold_version_id=? WHERE match_id=?",
        active.version().id(),
        matchId);
    result(3, null);

    // When
    SubmitContribution.Outcome third = submit(AUTHOR, "2", "https://youtu.be/third", false);

    // Then
    assertThat(third.version().state()).isEqualTo(State.PENDING);
    assertThat(contributions.version(pending.version().id()).orElseThrow().state())
        .isEqualTo(State.SUPERSEDED);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(active.version().id());
    assertThat(contributions.active(matchId)).isEmpty();
  }

  @ParameterizedTest
  @CsvSource({"false", "true"})
  @DisplayName("Another original account cannot reclaim a retained active version")
  void refusesForeignOrOwnerlessTarget(boolean erased) throws Exception {
    // Given
    SubmitContribution.Outcome original = submit(AUTHOR, "0", "https://youtu.be/original", false);
    if (erased) {
      sql.update("DELETE FROM account WHERE id=?", AUTHOR);
    }

    // When
    ResultActions response = change(OTHER, original.version().id(), "1", "withdraw");

    // Then
    response.andExpect(status().isNotFound());

    // When / Then
    assertThatThrownBy(() -> submit(OTHER, "1", "https://youtu.be/reclaim", false))
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            failure -> assertThat(failure.getStatus()).isEqualTo(Status.NOT_OWNER));
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(original.version().id());
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName("A reached lifetime quota preserves both versions after sporting correction")
  void preservesBothAtReachedQuota() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    submit(AUTHOR, "1", "https://youtu.be/first-proposal", false);
    SubmitContribution.Outcome pending =
        submit(AUTHOR, "2", "https://youtu.be/current-proposal", false);
    result(3, null);

    // When / Then
    assertThatThrownBy(() -> submit(AUTHOR, "3", "https://youtu.be/fourth", false))
        .isInstanceOfSatisfying(
            ContributionRejectedException.class,
            failure -> assertThat(failure.getStatus()).isEqualTo(Status.VERSION_LIMIT));
    assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(active.version());
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow()).isEqualTo(pending.version());
    assertThat(contributions.state(matchId).revision()).isEqualTo(3);
  }

  @Test
  @DisplayName("An erased original identity cannot withdraw its retained version")
  void refusesErasedOriginalIdentity() throws Exception {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/retained", false);
    sql.update("DELETE FROM account WHERE id=?", AUTHOR);

    // When
    ResultActions response = change(AUTHOR, active.version().id(), "1", "withdraw");

    // Then
    response.andExpect(status().isForbidden());
    assertThat(contributions.active(matchId).orElseThrow().ownerId()).isNull();
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName("Current sporting withdrawal prevents a retained owner command")
  void refusesHiddenMatch() throws Exception {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/retained", false);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);

    // When
    ResultActions response = change(AUTHOR, active.version().id(), "1", "withdraw");

    // Then
    response.andExpect(status().isNotFound());
    assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(active.version());
  }

  @Test
  @DisplayName("Withdrawal waits for retained publication attribution before loading the version")
  void waitsForPublicationActorErasure() throws Exception {
    // Given: approval is a controlled historical fixture, not US5 decision qualification.
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/approved", false);
    sql.update(
        "UPDATE contribution_version SET publication_kind='APPROVAL',publication_actor_id=? WHERE id=?",
        FOLLOWER,
        active.version().id());
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<ReadOwnContributions.Detail> pending =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, FOLLOWER);
                Future<ReadOwnContributions.Detail> future =
                    worker.submit(
                        () ->
                            tx.execute(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return changes.change(
                                      AUTHOR, matchId, active.version().id(), "1");
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                assertThat(future.isDone())
                    .as("Withdrawal must wait before hydrating retained attribution")
                    .isFalse();
                sql.update("DELETE FROM account WHERE id=?", FOLLOWER);
                return future;
              });

      // When
      ReadOwnContributions.Detail withdrawn = pending.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(withdrawn.version().state()).isEqualTo(State.WITHDRAWN);
      assertThat(contributions.version(active.version().id()).orElseThrow().publication().actorId())
          .isNull();
      assertThat(contributions.version(active.version().id()).orElseThrow().ownerId())
          .isEqualTo(AUTHOR);
      assertThat(contributions.state(matchId).revision()).isEqualTo(2);
    }
  }

  /**
   * Executes the explicit exact-target intent through the real generated HTTP/security boundary.
   *
   * @param owner original path and authenticated account
   * @param version exact selected version, never resolved from a current active row
   * @param revision captured contribution revision
   * @param action wire action, including the retired cancellation value for refusal coverage
   * @return actual HTTP result, with persistence assertions owned by the calling scenario
   */
  private ResultActions change(UUID owner, UUID version, String revision, String action)
      throws Exception {
    return mvc.perform(
        patch("/accounts/" + owner + "/matches/" + matchId + "/stream-contributions/" + version)
            .with(
                jwt()
                    .jwt(
                        token ->
                            token
                                .issuer("https://identity.example.invalid/")
                                .subject(owner.toString())
                                .claim("azp", "mobile-test")))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"revision\":\"" + revision + "\",\"action\":\"" + action + "\"}"));
  }
}
