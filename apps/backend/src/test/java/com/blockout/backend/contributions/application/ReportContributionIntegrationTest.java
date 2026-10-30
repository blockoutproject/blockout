package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;

/** Real HTTP, current account/sporting owners and disposable migrated PostgreSQL report facts. */
@AutoConfigureMockMvc
@DisplayName("Exact-version reports")
class ReportContributionIntegrationTest extends ContributionScenario {
  @Autowired private MockMvc mvc;
  @Autowired private ReportContribution reporting;
  @Autowired private ChangeDivisionLifecycle divisions;

  @Autowired
  private com.blockout.backend.sporting.application.service.MatchContributionAccess sporting;

  @Test
  @DisplayName("Trims the first reason and repeats unchanged after hiding")
  void repeatsAfterHiding() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    report(FOLLOWER, version, "  First reason  ")
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", path(FOLLOWER, version)))
        .andExpect(header().string("Cache-Control", "no-store"));
    report(OTHER, version, "Second").andExpect(status().isCreated());
    UUID third = reporter(4);
    report(third, version, "Third").andExpect(status().isCreated());

    // When
    ResultActions repeated = report(FOLLOWER, version, "Different reason");

    // Then
    repeated.andExpect(status().isOk()).andExpect(jsonPath("$.reported").value(true));
    assertThat(count("contribution_report")).isEqualTo(3);
    assertThat(
            sql.queryForObject(
                "SELECT reason FROM contribution_report WHERE reporter_id=?",
                String.class,
                FOLLOWER))
        .isEqualTo("First reason");
    assertThat(contributions.version(version).orElseThrow().state()).isEqualTo(State.HIDDEN);
    assertThat(contributions.state(matchId).revision()).isEqualTo(4);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(version);
    mvc.perform(
            get(path(FOLLOWER, version))
                .with(
                    jwt()
                        .jwt(
                            t ->
                                t.issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test")
                                    .subject(FOLLOWER.toString()))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reported").value(true))
        .andExpect(jsonPath("$.reason").doesNotExist())
        .andExpect(jsonPath("$.reporter").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Hides only at the current F02 threshold")
  void usesDefinitiveThreshold(boolean definitive) throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    if (definitive) result(2, ResultStateEnum.FINAL);
    int threshold = definitive ? 10 : 3;
    for (int n = 0; n < threshold - 1; n++)
      report(reporter(10 + n), version, "Reason").andExpect(status().isCreated());
    assertThat(contributions.active(matchId)).isPresent();

    // When
    report(reporter(30), version, "Last").andExpect(status().isCreated());

    // Then
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(count("contribution_report")).isEqualTo(threshold);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(version);
  }

  @Test
  @DisplayName("A result correction and duplicate do not evaluate the threshold")
  void evaluatesOnlyNewReports() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    result(2, ResultStateEnum.FINAL);
    for (int n = 0; n < 4; n++)
      report(reporter(10 + n), version, "Reason").andExpect(status().isCreated());

    // When
    result(3, null);
    report(reporterId(10), version, "Changed").andExpect(status().isOk());

    // Then
    assertThat(contributions.active(matchId)).isPresent();
    assertThat(contributions.state(matchId).revision()).isEqualTo(5);

    // When
    report(reporter(20), version, "New").andExpect(status().isCreated());

    // Then
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(count("contribution_report")).isEqualTo(5);
  }

  @Test
  @DisplayName("Reporting ignores publication age window and quota on an ownerless link")
  void reportsOwnerlessWithoutPublicationEligibility() throws Exception {
    // Given
    submit(FOLLOWER, "0", "https://youtu.be/first", false);
    submit(FOLLOWER, "1", "https://youtu.be/second", false);
    submit(FOLLOWER, "2", "https://youtu.be/third", false);
    moderator(AUTHOR);
    UUID version = submit(AUTHOR, "3", "https://youtu.be/viewed", true).version().id();
    sql.update("UPDATE contribution_version SET owner_id=NULL WHERE id=?", version);
    sql.update("UPDATE account SET principal_created_at=NULL WHERE id=?", FOLLOWER);
    sql.update("UPDATE sporting_match SET reliable_start=NULL WHERE id=?", matchId);

    // When
    ResultActions response = report(FOLLOWER, version, "Reason");

    // Then
    response.andExpect(status().isCreated());
    assertThat(count("contribution_report")).isEqualTo(1);
    assertThat(reads.read(FOLLOWER, matchId, 0).usage().versionsUsed()).isEqualTo(3);
  }

  @Test
  @DisplayName("Self-reporting is forbidden without a report or revision change")
  void refusesSelfReport() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();

    // When
    ResultActions response = report(AUTHOR, version, "Reason");

    // Then
    response.andExpect(status().isForbidden());
    assertThat(count("contribution_report")).isZero();
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName("An inactive unreported target conflicts without reporting its replacement")
  void refusesObsoleteVersion() throws Exception {
    // Given
    UUID original = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    UUID replacement = submit(AUTHOR, "1", "https://youtu.be/replacement", false).version().id();

    // When
    ResultActions response = report(FOLLOWER, original, "Reason");

    // Then
    response.andExpect(status().isConflict());
    assertThat(count("contribution_report")).isZero();
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(replacement);
    mvc.perform(
            get(path(FOLLOWER, original))
                .with(
                    jwt()
                        .jwt(
                            t ->
                                t.issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test")
                                    .subject(FOLLOWER.toString()))))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Multiple anonymous facts remain distinct and count toward hiding")
  void countsAnonymousFacts() throws Exception {
    // Given: attribution removal is a SQL fixture, not actual F05 erasure qualification.
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    report(FOLLOWER, version, "First").andExpect(status().isCreated());
    report(OTHER, version, "Second").andExpect(status().isCreated());
    sql.update(
        "UPDATE contribution_report SET reporter_id=NULL,reason=NULL WHERE version_id=?", version);

    // When
    report(FOLLOWER, version, "New original-account fact").andExpect(status().isCreated());

    // Then
    assertThat(count("contribution_report")).isEqualTo(3);
    assertThat(contributions.active(matchId)).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_report WHERE reporter_id IS NULL", Long.class))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("The unresolved hold applies across authors and addresses")
  void retainsHold() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    for (UUID actor : List.of(FOLLOWER, OTHER, reporter(4)))
      report(actor, version, "Reason").andExpect(status().isCreated());

    // When
    SubmitContribution.Outcome same = submit(AUTHOR, "4", "https://youtu.be/viewed", false);
    SubmitContribution.Outcome another = submit(OTHER, "5", "https://twitch.tv/new", false);

    // Then
    assertThat(same.version().state()).isEqualTo(State.PENDING);
    assertThat(another.version().state()).isEqualTo(State.PENDING);
    assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(version);
  }

  @Test
  @DisplayName("Concurrent reports from one account create one counted fact")
  void serializesDuplicates() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    CompletableFuture<Void> start = new CompletableFuture<>();
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<Integer> first =
          workers.submit(
              () -> {
                start.join();
                return report(FOLLOWER, version, "First").andReturn().getResponse().getStatus();
              });
      Future<Integer> second =
          workers.submit(
              () -> {
                start.join();
                return report(FOLLOWER, version, "Second").andReturn().getResponse().getStatus();
              });

      // When
      start.complete(null);
      List<Integer> statuses =
          List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));

      // Then
      assertThat(statuses).containsExactlyInAnyOrder(201, 200);
      assertThat(count("contribution_report")).isEqualTo(1);
      assertThat(contributions.state(matchId).revision()).isEqualTo(2);
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("A replacement racing a report never receives the old version's report")
  void serializesReplacement(boolean reportFirst) throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    try (ExecutorService workers = Executors.newSingleThreadExecutor()) {
      Future<?> waiting =
          tx.execute(
              status -> {
                sporting.lock(matchId);
                Future<?> work =
                    workers.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  waitingPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  if (reportFirst)
                                    submit(AUTHOR, "2", "https://youtu.be/replacement", false);
                                  else {
                                    org.assertj.core.api.Assertions.assertThatThrownBy(
                                            () -> reporting.report(FOLLOWER, version, "Viewed"))
                                        .isInstanceOf(ContributionConflictException.class);
                                    inner.setRollbackOnly();
                                  }
                                }));
                PostgresTestDatabase.awaitBlocked(sql, waitingPid);
                if (reportFirst) reporting.report(FOLLOWER, version, "Viewed");
                else submit(AUTHOR, "1", "https://youtu.be/replacement", false);
                return work;
              });

      // When
      waiting.get(20, TimeUnit.SECONDS);

      // Then
      UUID replacement = contributions.active(matchId).orElseThrow().id();
      assertThat(replacement).isNotEqualTo(version);
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM contribution_report WHERE version_id=?",
                  Long.class,
                  replacement))
          .isZero();
      assertThat(count("contribution_report")).isEqualTo(reportFirst ? 1 : 0);
    }
  }

  @Test
  @DisplayName("Reporting holds sporting roots before waiting for the reporter account")
  void ordersSportingBeforeAccounts() throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'division-lifecycle.manage')",
        OTHER);
    TransactionTemplate tx = new TransactionTemplate(transactions);
    CompletableFuture<Integer> reportPid = new CompletableFuture<>();
    CompletableFuture<Integer> divisionPid = new CompletableFuture<>();
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?>[] waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, FOLLOWER);
                Future<?> report =
                    workers.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  reportPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  reporting.report(FOLLOWER, version, "Viewed");
                                }));
                PostgresTestDatabase.awaitBlocked(sql, reportPid);
                Future<?> division =
                    workers.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  divisionPid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  divisions.setActive(
                                      OTHER, SportingIngestionFixture.DIVISION, "0", false);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, divisionPid);
                assertThat(division.isDone()).isFalse();
                return new Future<?>[] {report, division};
              });

      // When
      waiting[0].get(20, TimeUnit.SECONDS);
      waiting[1].get(20, TimeUnit.SECONDS);

      // Then
      assertThat(count("contribution_report")).isEqualTo(1);
      mvc.perform(
              get(path(FOLLOWER, version))
                  .with(
                      jwt()
                          .jwt(
                              t ->
                                  t.issuer("https://identity.example.invalid/")
                                      .claim("azp", "mobile-test")
                                      .subject(FOLLOWER.toString()))))
          .andExpect(status().isNotFound());
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("PostgreSQL rejects a duplicate non-null reporter or an unknown exact version")
  void enforcesReportIntegrity(boolean unknownVersion) throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();
    report(FOLLOWER, version, "First").andExpect(status().isCreated());
    UUID target =
        unknownVersion ? UUID.fromString("99999999-0000-4000-8000-000000000001") : version;

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable insert =
        () ->
            sql.update(
                "INSERT INTO contribution_report(id,version_id,reporter_id,reason,reported_at) VALUES (?,?,?,?,?)",
                UUID.randomUUID(),
                target,
                FOLLOWER,
                "Duplicate",
                java.sql.Timestamp.from(NOW));

    // Then
    org.assertj.core.api.Assertions.assertThatThrownBy(insert)
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    assertThat(count("contribution_report")).isEqualTo(1);
  }

  @ParameterizedTest
  @ValueSource(strings = {" ", "   "})
  @DisplayName("Whitespace-only reasons never record a report")
  void refusesBlankReason(String reason) throws Exception {
    // Given
    UUID version = submit(AUTHOR, "0", "https://youtu.be/viewed", false).version().id();

    // When
    ResultActions response = report(FOLLOWER, version, reason);

    // Then
    response.andExpect(status().isUnprocessableContent());
    assertThat(count("contribution_report")).isZero();
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
  }

  /**
   * Sends the reason-only request to its exact original account/version resource.
   *
   * @param actor original usable account
   * @param version exact viewed contribution
   * @param reason scenario-owned literal private reason
   * @return performed real MVC request for explicit status assertions
   */
  private ResultActions report(UUID actor, UUID version, String reason) throws Exception {
    return mvc.perform(
        post(path(actor, version))
            .with(
                jwt()
                    .jwt(
                        t ->
                            t.issuer("https://identity.example.invalid/")
                                .claim("azp", "mobile-test")
                                .subject(actor.toString())))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"reason\":\"" + reason + "\"}"));
  }

  /**
   * Builds the canonical resource URI; no match lookup can retarget this report.
   *
   * @param actor original usable account
   * @param version exact viewed contribution
   * @return the canonical account/version report path
   */
  private String path(UUID actor, UUID version) {
    return "/accounts/" + actor + "/stream-contributions/" + version + "/report";
  }

  /**
   * Creates an explicit synthetic current account without age evidence.
   *
   * @param n stable scenario-owned distinguishing suffix
   * @return newly inserted original account
   */
  private UUID reporter(int n) {
    UUID id = reporterId(n);
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', ?, ?, 'synthetic@example.invalid')",
        id,
        id.toString(),
        "reporter" + n);
    return id;
  }

  /**
   * Supplies a stable original identity for report-count and duplicate scenarios.
   *
   * @param n stable scenario-owned distinguishing suffix
   * @return distinct synthetic account identity
   */
  private UUID reporterId(int n) {
    return UUID.fromString("10000000-0000-4000-8000-" + String.format("%012d", n));
  }
}
