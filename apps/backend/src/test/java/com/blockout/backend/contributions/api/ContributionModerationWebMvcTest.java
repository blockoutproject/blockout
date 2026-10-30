package com.blockout.backend.contributions.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.application.PermissionStore;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.contributions.application.ModerateContribution;
import com.blockout.backend.contributions.application.ReadModeration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Generated MVC binding, real current permissions/admission and controlled application boundaries.
 */
@WebMvcTest(ContributionModerationController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  ContributionExceptionHandler.class,
  ContributionRequest.class,
  CurrentAccount.class,
  MaintenanceAdmission.class,
  ActionAuthorization.class,
  CurrentPermissions.class,
  ContributionModerationMapperImpl.class,
  ContributionApiMapperImpl.class,
  ConsultationApiMapperImpl.class
})
@DisplayName("Private moderation HTTP")
class ContributionModerationWebMvcTest {
  private static final UUID ACTOR = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID VERSION = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final String MEMBER =
      "/administration/matches/" + MATCH + "/stream-contributions/" + VERSION;
  @Autowired private MockMvc mvc;
  @MockitoBean private ModerateContribution commands;
  @MockitoBean private ReadModeration reads;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private org.springframework.transaction.PlatformTransactionManager transactions;

  /** Establishes only this slice's admitted original identity and exact moderation grant. */
  @BeforeEach
  void admit() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACTOR));
    when(permissions.findByAccountId(ACTOR)).thenReturn(Set.of(Permission.MODERATE_STREAM_LINKS));
  }

  @Test
  @DisplayName("Only the complete current video grant permits the private queue")
  void readsWithExactGrant() throws Exception {
    // Given
    when(reads.queue(ACTOR, null, null, null, null, 0))
        .thenReturn(new ReadModeration.Queue(List.of(), null, List.of()));

    // When
    ResultActions response = mvc.perform(get("/administration/stream-moderation").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  @DisplayName("An unrelated current grant exposes no private history")
  void refusesUnrelatedGrant() throws Exception {
    // Given
    when(permissions.findByAccountId(ACTOR)).thenReturn(Set.of());

    // When
    ResultActions response = mvc.perform(get(MEMBER).with(mobile()));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(reads, commands);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"actorAccountId\":null,\"revision\":\"1\",\"action\":\"approve\"}",
        "{\"actorAccountId\":\"00000000-0000-4000-8000-000000000001\",\"revision\":null,\"action\":\"reject\"}",
        "{\"actorAccountId\":\"00000000-0000-4000-8000-000000000001\",\"revision\":\"1\",\"action\":\"approve\",\"reporter\":\"forbidden\"}"
      })
  @DisplayName("Malformed atomic decisions are rejected before application writes")
  void refusesMalformed(String body) throws Exception {
    // Given: the parameter supplies one malformed atomic command.

    // When
    ResultActions response =
        mvc.perform(
            patch(MEMBER).with(mobile()).contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads, commands);
  }

  @Test
  @DisplayName("A different original actor is refused even with current video permission")
  void refusesChangedActor() throws Exception {
    // Given
    String body =
        "{\"actorAccountId\":\"" + VERSION + "\",\"revision\":\"1\",\"action\":\"approve\"}";

    // When
    ResultActions response =
        mvc.perform(
            patch(MEMBER).with(mobile()).contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(reads, commands);
  }

  @Test
  @DisplayName("Member reads preserve lineage decisions and exact private patch headers")
  void readsUsefulHistory() throws Exception {
    // Given
    ReadModeration.Detail detail = detail();
    when(reads.member(ACTOR, MATCH, VERSION)).thenReturn(detail);

    // When
    ResultActions response = mvc.perform(get(MEMBER).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(jsonPath("$.contribution.sourceVersionId").value(ACTOR.toString()))
        .andExpect(jsonPath("$.contribution.decisions[0].kind").value("approve"))
        .andExpect(jsonPath("$.contribution.decisions[1].kind").value("withdraw"))
        .andExpect(jsonPath("$.contribution.authorName").doesNotExist())
        .andExpect(jsonPath("$.contribution.decisions[0].actorName").doesNotExist());
  }

  @Test
  @DisplayName(
      "Reactivation returns 201 and the exact newly created administrative member Location")
  void createsIdentifiableVersion() throws Exception {
    // Given
    ReadModeration.Detail detail = detail();
    com.blockout.backend.contributions.application.SubmitContribution.Outcome outcome =
        new com.blockout.backend.contributions.application.SubmitContribution.Outcome(
            detail.contribution().version(), "2", true);
    when(commands.reactivate(ACTOR, MATCH, ACTOR, "1")).thenReturn(outcome);
    when(reads.result(ACTOR, outcome)).thenReturn(detail);

    // When
    ResultActions response =
        mvc.perform(
            post(MEMBER.replace(VERSION.toString(), ACTOR.toString()) + "/reactivations")
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"actorAccountId\":\"" + ACTOR + "\",\"revision\":\"1\"}"));

    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", MEMBER))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("An erased reason serializes as required null without reporter identity")
  void omitsReporterIdentity() throws Exception {
    // Given
    when(reads.reports(ACTOR, MATCH, VERSION, 0))
        .thenReturn(
            new ReadModeration.Reports(
                1,
                List.of(
                    new com.blockout.backend.contributions.application.ModerationStore.Report(
                        ACTOR, java.time.Instant.parse("2026-10-24T12:00:00Z"), null)),
                null));

    // When
    ResultActions response = mvc.perform(get(MEMBER + "/reports").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].reason").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.items[0].reporterId").doesNotExist())
        .andExpect(jsonPath("$.items[0].authorName").doesNotExist());
  }

  @Test
  @DisplayName("Ordinary maintenance admission still denies stream-only moderators")
  void keepsOrdinaryAdmission() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Maintenance", null));

    // When
    ResultActions response = mvc.perform(get(MEMBER).with(mobile()));

    // Then
    response.andExpect(status().isServiceUnavailable());
    verifyNoInteractions(reads, commands);
  }

  @Test
  @DisplayName("Collection reads preserve hidden dateless context and private headers")
  void readsCollection() throws Exception {
    // Given
    com.blockout.backend.sporting.application.ConsultationViews.Identity home =
        new com.blockout.backend.sporting.application.ConsultationViews.Identity(
            ACTOR, "Home", null, null);
    com.blockout.backend.sporting.application.ConsultationViews.PoolSummary pool =
        new com.blockout.backend.sporting.application.ConsultationViews.PoolSummary(
            home,
            new com.blockout.backend.sporting.application.model.SportingViews.SeasonView(
                ACTOR, 2026, "2026/2027"),
            new com.blockout.backend.sporting.application.ConsultationViews.Classification(
                null, null, null),
            null,
            null);
    ReadModeration.Match match =
        new ReadModeration.Match(
            "2",
            new com.blockout.backend.sporting.application.ReadPrivateMatches.Context(
                MATCH,
                ACTOR,
                home,
                new com.blockout.backend.sporting.application.ConsultationViews.Identity(
                    VERSION, "Away", null, null),
                pool,
                null,
                null,
                false),
            new com.blockout.backend.contributions.application.ModerationStore.Activity(
                MATCH,
                new com.blockout.backend.contributions.application.ModerationStore.Counts(
                    0, 0, 0, 0, 0),
                false,
                null),
            false,
            null,
            List.of(detail().contribution()),
            null);
    when(reads.read(ACTOR, MATCH, null, 0)).thenReturn(match);

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/matches/" + MATCH + "/stream-contributions").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.match.publiclyViewable").value(false))
        .andExpect(jsonPath("$.match.schedule").doesNotExist())
        .andExpect(jsonPath("$.canPublish").value(false))
        .andExpect(jsonPath("$.items[0].id").value(VERSION.toString()));
  }

  @Test
  @DisplayName("An exact acknowledged terminal decision returns 200 without changing its revision")
  void acknowledgesExactTerminalDecision() throws Exception {
    // Given
    ReadModeration.Detail detail = detail();
    com.blockout.backend.contributions.application.SubmitContribution.Outcome outcome =
        new com.blockout.backend.contributions.application.SubmitContribution.Outcome(
            detail.contribution().version(), "2", false);
    when(commands.change(
            ACTOR,
            MATCH,
            VERSION,
            "2",
            com.blockout.backend.generated.mobile.model.StreamModerationActionEnum.WITHDRAW))
        .thenReturn(outcome);
    when(reads.result(ACTOR, outcome)).thenReturn(detail);

    // When
    ResultActions response =
        mvc.perform(
            patch(MEMBER)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"actorAccountId\":\""
                        + ACTOR
                        + "\",\"revision\":\"2\",\"action\":\"withdraw\"}"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName(
      "A stale exact decision returns the safe canonical 409 instead of a success projection")
  void refusesStaleDecision() throws Exception {
    // Given
    when(commands.change(
            ACTOR,
            MATCH,
            VERSION,
            "old",
            com.blockout.backend.generated.mobile.model.StreamModerationActionEnum.WITHDRAW))
        .thenThrow(
            new com.blockout.backend.contributions.application.ContributionRejectedException(
                com.blockout.backend.contributions.domain.ContributionEligibility.Status
                    .STALE_REVISION));

    // When
    ResultActions response =
        mvc.perform(
            patch(MEMBER)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"actorAccountId\":\""
                        + ACTOR
                        + "\",\"revision\":\"old\",\"action\":\"withdraw\"}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));
    verifyNoInteractions(reads);
  }

  /** Two retained useful decisions and erased attribution form a real immutable mapper input. */
  private ReadModeration.Detail detail() {
    java.time.Instant now = java.time.Instant.parse("2026-10-24T12:00:00Z");
    com.blockout.backend.contributions.domain.ContributionVersion version =
        new com.blockout.backend.contributions.domain.ContributionVersion(
            VERSION,
            MATCH,
            new com.blockout.backend.contributions.domain.StreamAddress("https://youtu.be/private"),
            null,
            com.blockout.backend.contributions.domain.ContributionVersion.State.WITHDRAWN,
            now,
            true,
            ACTOR,
            null,
            new com.blockout.backend.contributions.domain.ContributionVersion.Decision(
                com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind.APPROVAL,
                now,
                null),
            new com.blockout.backend.contributions.domain.ContributionVersion.Decision(
                com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind
                    .WITHDRAWAL,
                now.plusSeconds(60),
                null));
    return new ReadModeration.Detail(
        "2", new ReadModeration.Version(version, null, null, null, 3, true));
  }

  /** Supplies a controlled mobile token; signature verification has its separate real-key suite. */
  private RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("subject")
                    .claim("azp", "mobile-test"));
  }
}
