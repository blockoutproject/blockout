package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import com.blockout.backend.notifications.application.ProcessResultAnnouncement;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real producers/recipient union/SQL and after-commit handoff; no provider or actual moderation.
 */
@Import(ContributionAnnouncementsIntegrationTest.ProbeConfiguration.class)
@DisplayName("Atomic contribution, result and announcement composition")
class ContributionAnnouncementsIntegrationTest extends ContributionScenario {
  @Autowired private Probe probe;

  @Autowired
  private com.blockout.backend.sporting.application.service.MatchContributionAccess sportingContext;

  @Autowired
  private com.blockout.backend.notifications.application.AnnouncementRecipients recipientSelection;

  @Autowired private ContributionTransitions transitions;

  /** Clears only this test's ephemeral handoff observations. */
  @BeforeEach
  void clearProbe() {
    probe.ids.clear();
    probe.relationCounts.clear();
    probe.fail = false;
  }

  @Test
  @DisplayName("Publication before the first result yields live then one enriched result")
  void enrichesAfterPublicLink() {
    // Given
    follow(FOLLOWER);
    for (UUID team :
        sql.queryForList(
            "SELECT home_team_id FROM sporting_match WHERE id=? UNION SELECT away_team_id FROM sporting_match WHERE id=?",
            UUID.class,
            matchId,
            matchId)) {
      follows.replace(
          new com.blockout.backend.following.application.FollowContext(
              FOLLOWER,
              new com.blockout.backend.following.application.FollowContext.Target(
                  com.blockout.backend.following.application.FollowContext.TargetType.TEAM, team)),
          true);
    }
    submit(AUTHOR, "0", "https://youtube.com/live", false);

    // When
    result(2, ResultStateEnum.FINAL);

    // Then
    assertThat(families()).containsExactlyInAnyOrder("LIVE_LINK", "ENRICHED_RESULT");
    assertThat(probe.ids).hasSize(2);
    assertThat(probe.relationCounts).containsExactly(3, 3);
    assertThat(
            sql.queryForObject(
                "SELECT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
  }

  @Test
  @DisplayName(
      "A later moderator publication preserves plain composition and creates replay for current followers")
  void announcesLaterPublication() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    follow(OTHER);
    moderator(AUTHOR);

    // When
    submit(AUTHOR, "0", "https://youtube.com/replay", true);

    // Then
    assertThat(families())
        .containsExactlyInAnyOrder("PLAIN_RESULT", "POST_RESULT_LINK", "POST_RESULT_LINK");
    assertThat(
            sql.queryForList(
                "SELECT family FROM notification WHERE account_id=?", String.class, OTHER))
        .containsExactly("POST_RESULT_LINK");
    assertThat(
            sql.queryForObject(
                "SELECT result_composition FROM match_announcement WHERE match_id=?",
                String.class,
                matchId))
        .isEqualTo("PLAIN_RESULT");
  }

  @Test
  @DisplayName("Required inbox persistence failure rolls back publication, revision and allowances")
  void rollsBackPublication() {
    // Given
    result(2, ResultStateEnum.FINAL);
    follow(FOLLOWER);
    moderator(AUTHOR);
    duplicateFamily("POST_RESULT_LINK");

    // When / Then
    assertThatThrownBy(() -> submit(AUTHOR, "0", "https://youtube.com/replay", true))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThat(count("contribution_version")).isZero();
    assertThat(count("contribution_state")).isZero();
    assertThat(probe.ids).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isFalse();
  }

  @Test
  @DisplayName("Required inbox failure rolls back only the affected result acceptance")
  void rollsBackResult() {
    // Given
    follow(FOLLOWER);
    duplicateFamily("PLAIN_RESULT");

    // When / Then
    assertThatThrownBy(() -> result(2, ResultStateEnum.FINAL))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, matchId))
        .isNull();
    assertThat(count("match_announcement")).isZero();
    assertThat(count("notification")).isEqualTo(1);
    assertThat(probe.ids).isEmpty();
  }

  @Test
  @DisplayName("An after-commit sender failure cannot roll back the accepted result and inbox")
  void preservesCommitAfterHandoffFailure() {
    // Given
    follow(FOLLOWER);
    probe.fail = true;

    // When
    result(2, ResultStateEnum.FINAL);

    // Then
    assertThat(families()).containsExactly("PLAIN_RESULT");
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, matchId))
        .isEqualTo("FINAL");
    assertThat(probe.ids).hasSize(1);
  }

  @Test
  @DisplayName("Zero recipients consume live and replay so later follows receive no backfill")
  void preservesEmptyAudienceFacts() {
    // Given
    submit(AUTHOR, "0", "https://youtube.com/live", false);
    result(2, ResultStateEnum.FINAL);
    follow(FOLLOWER);
    moderator(AUTHOR);

    // When
    submit(AUTHOR, "1", "https://youtube.com/new", true);
    due.run();

    // Then
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT live_processed AND result_processed AND post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
  }

  @Test
  @DisplayName(
      "Controlled personal row purge leaves an unused later-link allowance available exactly once")
  void allowsReplayAfterControlledPurge() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    sql.update("DELETE FROM notification");
    moderator(AUTHOR);

    // When
    submit(AUTHOR, "0", "https://youtube.com/replay", true);
    sql.update("DELETE FROM notification");
    submit(AUTHOR, "1", "https://youtube.com/replacement", true);
    result(3, null);
    result(4, ResultStateEnum.FINAL);

    // Then
    assertThat(count("notification")).isZero();
    assertThat(probe.ids).hasSize(2);
    assertThat(
            sql.queryForObject(
                "SELECT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
  }

  @Test
  @DisplayName(
      "Controlled hiding and a new exempt version do not renew an enriched replay allowance")
  void preservesAllowanceThroughControlledReactivation() {
    // Given
    follow(FOLLOWER);
    SubmitContribution.Outcome original = submit(AUTHOR, "0", "https://youtube.com/live", false);
    result(2, ResultStateEnum.FINAL);
    sql.update(
        "UPDATE contribution_version SET state='HIDDEN' WHERE id=?", original.version().id());
    sql.update(
        "UPDATE contribution_state SET report_hold_version_id=? WHERE match_id=?",
        original.version().id(),
        matchId);
    sql.update("DELETE FROM notification");
    moderator(AUTHOR);

    // When: explicit source-linked reactivation fixture; no actual moderation command exists here.
    UUID reactivated = UUID.fromString("00000000-0000-4000-8000-000000000252");
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts
                  facts = sportingContext.lock(matchId);
              com.blockout.backend.notifications.application.AnnouncementRecipients.Selection
                  selection = recipientSelection.select(facts.match(), java.util.Set.of(AUTHOR));
              sql.update(
                  "INSERT INTO contribution_version(id,match_id,address,platform,owner_id,state,created_at,quota_participating,source_version_id,publication_kind,publication_at,publication_actor_id) VALUES (?,?,?,'YOUTUBE',?,'ACTIVE',?,FALSE,?,'REACTIVATION',?,?)",
                  reactivated,
                  matchId,
                  original.version().address().value(),
                  AUTHOR,
                  java.sql.Timestamp.from(NOW),
                  original.version().id(),
                  java.sql.Timestamp.from(NOW),
                  AUTHOR);
              sql.update(
                  "UPDATE contribution_state SET revision=revision+1,report_hold_version_id=NULL WHERE match_id=?",
                  matchId);
              transitions.published(facts, selection.recipients(), NOW);
            });

    // Then
    assertThat(count("notification")).isZero();
    assertThat(contributions.state(matchId).reportHoldVersionId()).isNull();
    assertThat(count("contribution_version")).isEqualTo(2);
    assertThat(contributions.active(matchId).orElseThrow().sourceVersionId())
        .isEqualTo(original.version().id());
  }

  @Test
  @DisplayName("Concurrent result waits for publication and observes its committed public link")
  void serializesPublicationBeforeResult() throws Exception {
    // Given
    follow(FOLLOWER);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                submit(AUTHOR, "0", "https://youtube.com/live", false);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  result(2, ResultStateEnum.FINAL);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return future;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(families()).containsExactlyInAnyOrder("LIVE_LINK", "ENRICHED_RESULT");
    }
  }

  @Test
  @DisplayName(
      "Complete audience locks precede the author lock even when the author is not a follower")
  void locksCompleteAccountUnion() throws Exception {
    // Given
    follow(FOLLOWER);
    follow(OTHER);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, OTHER);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "0", "https://youtube.com/live", false);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                assertThatThrownBy(
                        () ->
                            independent.execute(
                                inner ->
                                    sql.queryForObject(
                                        "SELECT id FROM account WHERE id=? FOR UPDATE NOWAIT",
                                        UUID.class,
                                        FOLLOWER)))
                    .isInstanceOf(org.springframework.dao.DataAccessException.class);
                // The later author must not have been locked before the smaller audience
                // identities.
                assertThat(
                        independent.<UUID>execute(
                            inner ->
                                sql.queryForObject(
                                    "SELECT id FROM account WHERE id=? FOR UPDATE NOWAIT",
                                    UUID.class,
                                    AUTHOR)))
                    .isEqualTo(AUTHOR);
                return future;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(count("notification")).isEqualTo(2);
    }
  }

  @Test
  @DisplayName(
      "Concurrent publication waits for a final result and keeps plain plus separate replay")
  void serializesResultBeforePublication() throws Exception {
    // Given
    follow(FOLLOWER);
    moderator(AUTHOR);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                result(2, ResultStateEnum.FINAL);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "0", "https://youtube.com/replay", true);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return future;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(families()).containsExactlyInAnyOrder("PLAIN_RESULT", "POST_RESULT_LINK");
    }
  }

  @Test
  @DisplayName(
      "Deleting the original actor while submission waits prevents all publication effects")
  void rejectsDeletedActor() throws Exception {
    // Given
    follow(FOLLOWER);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, AUTHOR);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "0", "https://youtube.com/live", false);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                sql.update("DELETE FROM account WHERE id=?", AUTHOR);
                return future;
              });

      // When / Then
      assertThatThrownBy(() -> waiting.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(
              com.blockout.backend.accounts.application.exception.AccountNotFoundException.class);
      assertThat(count("contribution_version")).isZero();
      assertThat(count("notification")).isZero();
    }
  }

  @Test
  @DisplayName(
      "A first finished discovery is silent but a genuinely later publication may announce replay")
  void distinguishesFinishedDiscovery() {
    // Given
    follow(FOLLOWER);
    CalendarObservation.Match candidate =
        com.blockout.backend.sporting.support.SportingIngestionFixture.candidate(
            "finished", "Home", java.time.LocalDate.of(2026, 10, 24));
    CalendarObservation.Match finished =
        new CalendarObservation.Match(
            candidate.nativeMatchReference(),
            candidate.home(),
            candidate.away(),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    ._localDate(java.time.LocalDate.of(2026, 10, 24))
                    .result(
                        new com.blockout.backend.generated.ingestion.model
                                .MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(3)
                            .awaySets(1))),
            null);

    // When
    calendars.accept(
        scope.pool(),
        new CalendarObservation(context(2), true, List.of(finished), List.of(), List.of()));
    UUID finishedId =
        sql.queryForObject("SELECT id FROM sporting_match WHERE reference='finished'", UUID.class);

    // Then
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT result_processed AND NOT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                finishedId))
        .isTrue();
    moderator(AUTHOR);
    submissions.submit(AUTHOR, finishedId, "0", URI.create("https://youtube.com/later"), true);
    assertThat(families()).containsExactly("POST_RESULT_LINK");
  }

  @Test
  @DisplayName("Trusted reconstruction of a known match records silent result processing")
  void suppressesReconstruction() {
    // Given: persisted trusted mode fixture; F01's admission rules have their own qualification.
    follow(FOLLOWER);
    sql.update("UPDATE collection_cycle SET mode='INITIAL_IMPORT' WHERE id=?", scope.cycle().id());

    // When
    result(2, ResultStateEnum.FINAL);
    result(3, ResultStateEnum.FINAL);

    // Then
    assertThat(count("notification")).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT result_processed AND NOT post_result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT result_composition FROM match_announcement WHERE match_id=?",
                String.class,
                matchId))
        .isNull();
  }

  @Test
  @DisplayName(
      "A correction and result withdrawal preserve the original personal read state and creation time")
  void preservesPersonalOrigin() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    UUID id = sql.queryForObject("SELECT id FROM notification", UUID.class);
    sql.update("UPDATE notification SET is_read=TRUE WHERE id=?", id);

    // When
    result(3, null);
    result(4, ResultStateEnum.FINAL);

    // Then
    assertThat(sql.queryForObject("SELECT id FROM notification", UUID.class)).isEqualTo(id);
    assertThat(sql.queryForObject("SELECT is_read FROM notification", Boolean.class)).isTrue();
    assertThat(
            sql.queryForObject("SELECT created_at FROM notification", OffsetDateTime.class)
                .toInstant())
        .isEqualTo(NOW);
    assertThat(probe.ids).containsExactly(id);
  }

  @Test
  @DisplayName("A due pass racing a publication consumes the live allowance only once")
  void serializesDuePassWithPublication() throws Exception {
    // Given
    moderator(AUTHOR);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        java.sql.Timestamp.from(NOW.plusSeconds(60)),
        matchId);
    submit(AUTHOR, "0", "https://youtube.com/advance", true);
    follow(FOLLOWER);
    org.mockito.Mockito.when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                due.run();
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "1", "https://youtube.com/replacement", true);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return future;
              });

      // When
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(families()).containsExactly("LIVE_LINK");
    }
  }

  @Test
  @DisplayName("Concurrent same-match submissions cannot overwrite an unseen revision")
  void rejectsConcurrentStaleRevision() throws Exception {
    // Given
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                submit(AUTHOR, "0", "https://youtube.com/first", false);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "0", "https://youtube.com/second", false);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return future;
              });

      // When / Then
      assertThatThrownBy(() -> waiting.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(ContributionRejectedException.class);
      assertThat(count("contribution_version")).isEqualTo(1);
      assertThat(contributions.state(matchId).revision()).isEqualTo(1);
    }
  }

  @Test
  @DisplayName("Current moderator grant is reread after the actor lock wait")
  void rejectsWithdrawnModeratorGrant() throws Exception {
    // Given
    moderator(AUTHOR);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, AUTHOR);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submit(AUTHOR, "0", "https://youtube.com/denied", true);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                sql.update("DELETE FROM account_permission WHERE account_id=?", AUTHOR);
                return future;
              });

      // When / Then
      assertThatThrownBy(() -> waiting.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccessDeniedException.class);
      assertThat(count("contribution_version")).isZero();
    }
  }

  @Test
  @DisplayName("Concurrent different-match submissions cannot exceed the derived Paris-day quota")
  void serializesDifferentMatchQuota() throws Exception {
    // Given: two persisted participating matches have already consumed daily slots.
    TransactionTemplate tx = new TransactionTemplate(transactions);
    tx.executeWithoutResult(
        status -> {
          for (int n = 0; n < 2; n++) {
            UUID id = UUID.randomUUID();
            sql.update(
                "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,reliable_start) SELECT ?,pool_id,?,home_team_id,away_team_id,local_date,reliable_start FROM sporting_match WHERE id=?",
                id,
                "previous-" + n,
                matchId);
            contributions.record(
                id,
                AUTHOR,
                new StreamAddress("https://youtube.com/previous-" + n),
                false,
                false,
                NOW);
          }
        });
    UUID second = UUID.randomUUID();
    sql.update(
        "INSERT INTO sporting_match(id,pool_id,reference,home_team_id,away_team_id,local_date,reliable_start) SELECT ?,pool_id,'concurrent-second',home_team_id,away_team_id,local_date,reliable_start FROM sporting_match WHERE id=?",
        second,
        matchId);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                submit(AUTHOR, "0", "https://youtube.com/third", false);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  submissions.submit(
                                      AUTHOR,
                                      second,
                                      "0",
                                      URI.create("https://youtube.com/fourth"),
                                      false);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return future;
              });

      // When / Then
      assertThatThrownBy(() -> waiting.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(ContributionRejectedException.class);
      assertThat(count("contribution_version")).isEqualTo(3);
      assertThat(contributions.state(second).revision()).isZero();
      assertThat(reads.read(AUTHOR, matchId, 0).usage().dailyMatchesUsed()).isEqualTo(3);
    }
  }

  /** Returns persisted families without imposing an arbitrary personal insertion order. */
  private List<String> families() {
    return sql.queryForList("SELECT family FROM notification", String.class);
  }

  /** Creates an intentional unique-constraint collision to fail the real required inbox writer. */
  private void duplicateFamily(String family) {
    sql.update(
        "INSERT INTO notification(id,account_id,match_id,family,variant,created_at,is_read) VALUES (?,?,?,?,'FIRST',?,FALSE)",
        UUID.randomUUID(),
        FOLLOWER,
        matchId,
        family,
        java.sql.Timestamp.from(NOW));
  }

  /** Test-only external handoff observer; not a production participant or provider. */
  @TestConfiguration(proxyBeanMethods = false)
  static class ProbeConfiguration {
    /** Registers only the controlled post-commit observation boundary. */
    @Bean
    Probe probe(JdbcTemplate sql, PlatformTransactionManager transactions) {
      return new Probe(sql, transactions);
    }
  }

  /**
   * Observes committed visibility on a separate transaction before an optional external failure.
   */
  static class Probe {
    final List<UUID> ids = new java.util.concurrent.CopyOnWriteArrayList<>();
    final java.util.List<Integer> relationCounts =
        new java.util.concurrent.CopyOnWriteArrayList<>();
    final JdbcTemplate sql;
    final PlatformTransactionManager transactions;
    boolean fail;

    /** Supplies the actual database owner and independent transaction facility. */
    Probe(JdbcTemplate sql, PlatformTransactionManager transactions) {
      this.sql = sql;
      this.transactions = transactions;
    }

    /**
     * Checks committed entry visibility, retaining no address, user payload or provider credential.
     */
    @EventListener
    void ready(AfterCommitAnnouncements.Ready ready) {
      TransactionTemplate independent = new TransactionTemplate(transactions);
      independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
      for (ProcessResultAnnouncement.Created created : ready.entries()) {
        assertThat(
                independent.<Long>execute(
                    status ->
                        sql.queryForObject(
                            "SELECT COUNT(*) FROM notification WHERE id=?",
                            Long.class,
                            created.entry().id())))
            .isEqualTo(1);
        ids.add(created.entry().id());
        relationCounts.add(created.relations().size());
      }
      if (fail) throw new IllegalStateException("Controlled external sender failure");
    }
  }
}
