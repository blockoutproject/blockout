package com.blockout.backend.contributions.api;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import java.time.LocalDate;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Qualifies F08 erasure against actual F02 visibility, F03 projections and F12 admission in
 * migrated PostgreSQL. Validated principal claims and time are controlled; providers and devices
 * are absent.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = "blockout.accounts.cleanup.environment=disabled")
@DisplayName("Contribution erasure across sporting and admission boundaries")
class ContributionErasureBoundaryIntegrationTest extends ContributionScenario {
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private MockMvc mvc;
  @Autowired private EraseAccount erasure;
  @Autowired private AccountStore accounts;
  @Autowired private ReportContribution reporting;
  @MockitoSpyBean private AccountAccess accountLocks;

  /** Restores this suite's disposable admission fixture independently of test execution order. */
  @BeforeEach
  void resetAdmissionFixture() {
    sql.update("UPDATE access_settings SET active=false WHERE id='maintenance'");
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Sporting withdrawal and return preserve erased active or report-hidden links")
  void preservesErasedVisibilityAcrossSportingReturn(boolean hidden) throws Exception {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome submitted = submit(AUTHOR, "0", "https://youtu.be/retained", false);
    UUID version = submitted.version().id();
    if (hidden) {
      UUID thirdReporter = UUID.fromString("00000000-0000-4000-8000-000000000289");
      sql.update(
          "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,?,?,'Reporter289','synthetic@example.invalid')",
          thirdReporter,
          ISSUER,
          thirdReporter.toString());
      reporting.report(FOLLOWER, version, "Synthetic first reason");
      reporting.report(OTHER, version, "Synthetic second reason");
      reporting.report(thirdReporter, version, "Synthetic third reason");
    }
    erasure.erase(ISSUER, AUTHOR.toString(), AUTHOR);
    ContributionVersion retained = contributions.version(version).orElseThrow();
    long revision = contributions.state(matchId).revision();

    // When
    assertThat(
            calendars
                .accept(
                    scope.pool(),
                    new CalendarObservation(
                        context(2),
                        true,
                        List.of(candidate("M2", "Home", LocalDate.of(2026, 10, 24))),
                        List.of(),
                        List.of()))
                .absenceReconciled())
        .isTrue();

    // Then
    mvc.perform(get("/matches/" + matchId)).andExpect(status().isNotFound());
    mvc.perform(get(collection()).with(principal(OTHER)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.match.publiclyViewable").value(false))
        .andExpect(jsonPath("$.canPublish").value(false));
    mvc.perform(get(member(version)).with(principal(OTHER)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contribution.authorName").doesNotExist())
        .andExpect(jsonPath("$.contribution.state").value(hidden ? "hidden" : "active"));
    mvc.perform(
            post(collection())
                .with(principal(OTHER))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"actorAccountId\":\""
                        + OTHER
                        + "\",\"revision\":\""
                        + revision
                        + "\",\"url\":\"https://youtu.be/refused\"}"))
        .andExpect(status().isNotFound());

    // When
    assertThat(
            calendars
                .accept(
                    scope.pool(),
                    new CalendarObservation(
                        context(3),
                        true,
                        List.of(
                            candidate("M1", "Home", LocalDate.of(2026, 10, 24)),
                            candidate("M2", "Home", LocalDate.of(2026, 10, 24))),
                        List.of(),
                        List.of()))
                .absenceReconciled())
        .isTrue();

    // Then
    ResultActions publicMatch = mvc.perform(get("/matches/" + matchId)).andExpect(status().isOk());
    if (hidden) {
      publicMatch
          .andExpect(jsonPath("$.streamUrl").doesNotExist())
          .andExpect(jsonPath("$.streamContributionId").doesNotExist());
      assertThat(contributions.state(matchId).reportHoldVersionId()).isEqualTo(version);
    } else {
      publicMatch
          .andExpect(jsonPath("$.streamUrl").value("https://youtu.be/retained"))
          .andExpect(jsonPath("$.streamContributionId").value(version.toString()));
    }
    assertThat(contributions.version(version).orElseThrow()).isEqualTo(retained);
    assertThat(retained.ownerId()).isNull();
    assertThat(contributions.state(matchId).revision()).isEqualTo(revision);
    assertThat(count("contribution_version")).isEqualTo(1);
  }

  @Test
  @DisplayName("Retained ownerless links obey current maintenance and explicit independent bypass")
  void appliesCurrentAdmissionToErasedLinks() throws Exception {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome submitted = submit(AUTHOR, "0", "https://youtu.be/ownerless", false);
    erasure.erase(ISSUER, AUTHOR.toString(), AUTHOR);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'maintenance.manage')",
        OTHER);
    long revision =
        sql.queryForObject(
            "SELECT revision FROM access_settings WHERE id='maintenance'", Long.class);

    // When
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(principal(OTHER))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":" + revision + ",\"active\":true}"))
        .andExpect(status().isOk());

    // Then
    mvc.perform(get("/matches/" + matchId))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    mvc.perform(get(member(submitted.version().id())).with(principal(OTHER)))
        .andExpect(status().isServiceUnavailable());
    String withdrawal =
        "{\"actorAccountId\":\"" + OTHER + "\",\"revision\":\"1\",\"action\":\"withdraw\"}";
    mvc.perform(
            patch(member(submitted.version().id()))
                .with(principal(OTHER))
                .contentType(MediaType.APPLICATION_JSON)
                .content(withdrawal))
        .andExpect(status().isServiceUnavailable());
    mvc.perform(
            get(member(submitted.version().id()))
                .with(principal(OTHER))
                .header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isForbidden());
    mvc.perform(
            patch(member(submitted.version().id()))
                .with(principal(OTHER))
                .header("Blockout-Maintenance-Bypass", "true")
                .contentType(MediaType.APPLICATION_JSON)
                .content(withdrawal))
        .andExpect(status().isForbidden());

    // Given: F12 grants have no management endpoint; only their assignment is a SQL fixture.
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'maintenance.bypass')",
        OTHER);

    // When / Then
    mvc.perform(get(member(submitted.version().id())).with(principal(OTHER)))
        .andExpect(status().isServiceUnavailable());
    mvc.perform(
            get(member(submitted.version().id()))
                .with(principal(OTHER))
                .header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.contribution.authorName").doesNotExist());
    mvc.perform(
            get("/matches/" + matchId)
                .with(principal(OTHER))
                .header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.streamContributionId").value(submitted.version().id().toString()));

    // When
    sql.update(
        "DELETE FROM account_permission WHERE account_id=? AND permission='stream-links.moderate'",
        OTHER);

    // Then
    mvc.perform(
            get(member(submitted.version().id()))
                .with(principal(OTHER))
                .header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isForbidden());
    assertThat(contributions.active(matchId).orElseThrow().id())
        .isEqualTo(submitted.version().id());
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
  }

  @Test
  @DisplayName(
      "A delayed erased moderator cannot act through a newly granted replacement lifecycle")
  void refusesDelayedErasedModerator() throws Exception {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome submitted = submit(AUTHOR, "0", "https://youtu.be/delayed", false);
    CompletableFuture<Void> beforeAccount = new CompletableFuture<>();
    CompletableFuture<Void> proceed = new CompletableFuture<>();
    doAnswer(
            invocation -> {
              beforeAccount.complete(null);
              proceed.get(10, TimeUnit.SECONDS);
              return invocation.callRealMethod();
            })
        .when(AopTestUtils.<AccountAccess>getUltimateTargetObject(accountLocks))
        .lock(OTHER);
    try (ExecutorService worker = Executors.newFixedThreadPool(2)) {
      Future<ResultActions> pending =
          worker.submit(
              () ->
                  mvc.perform(
                      patch(member(submitted.version().id()))
                          .with(principal(OTHER))
                          .contentType(MediaType.APPLICATION_JSON)
                          .content(
                              "{\"actorAccountId\":\""
                                  + OTHER
                                  + "\",\"revision\":\"1\",\"action\":\"withdraw\"}")));
      beforeAccount.get(10, TimeUnit.SECONDS);

      // When: the real command holds sporting roots while F05 erases only the original account.
      worker.submit(() -> erasure.erase(ISSUER, OTHER.toString(), OTHER)).get(10, TimeUnit.SECONDS);
      UUID recreated =
          new TransactionTemplate(transactions)
              .execute(
                  transaction ->
                      accounts
                          .create(
                              ISSUER,
                              OTHER.toString(),
                              "Replacement289",
                              "new@example.invalid",
                              null)
                          .id());
      moderator(recreated);
      proceed.complete(null);

      // Then
      pending.get(10, TimeUnit.SECONDS).andExpect(status().isNotFound());
      mvc.perform(get(member(submitted.version().id())).with(principal(OTHER)))
          .andExpect(status().isOk());
      mvc.perform(
              patch(member(submitted.version().id()))
                  .with(principal(OTHER))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      "{\"actorAccountId\":\""
                          + OTHER
                          + "\",\"revision\":\"1\",\"action\":\"withdraw\"}"))
          .andExpect(status().isForbidden());
      assertThat(contributions.active(matchId).orElseThrow()).isEqualTo(submitted.version());
      assertThat(contributions.state(matchId).revision()).isEqualTo(1);
      assertThat(count("contribution_version")).isEqualTo(1);
    } finally {
      proceed.complete(null);
    }
  }

  /** Returns this retained match's canonical private version collection. */
  private String collection() {
    return "/administration/matches/" + matchId + "/stream-contributions";
  }

  /**
   * Addresses the supplied exact retained version without resolving the current active version.
   *
   * @param version immutable target identity
   * @return canonical moderation member path
   */
  private String member(UUID version) {
    return collection() + "/" + version;
  }

  /**
   * Supplies already validated synthetic claims; F05 resolves their current local lifecycle.
   *
   * @param subject principal subject that remains stable across deliberate business recreation
   * @return request-scoped mobile principal
   */
  private static RequestPostProcessor principal(UUID subject) {
    return jwt()
        .jwt(token -> token.issuer(ISSUER).subject(subject.toString()).claim("azp", "mobile-test"));
  }
}
