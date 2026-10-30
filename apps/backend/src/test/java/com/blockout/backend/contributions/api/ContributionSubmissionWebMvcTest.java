package com.blockout.backend.contributions.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.contributions.application.ChangeOwnContribution;
import com.blockout.backend.contributions.application.ContributionRejectedException;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.application.SubmitModeratedContribution;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Production controller/generated interfaces/security/owner/admission; application SQL is
 * controlled.
 */
@WebMvcTest(ContributionsController.class)
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
  ContributionApiMapperImpl.class,
  SubmitModeratedContribution.class
})
@DisplayName("Generated contribution submission HTTP boundary")
class ContributionSubmissionWebMvcTest {
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID VERSION = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final String PATH =
      "/accounts/" + OWNER + "/matches/" + MATCH + "/stream-contributions";
  @Autowired private MockMvc mvc;
  @MockitoBean private SubmitContribution submissions;
  @MockitoBean private ChangeOwnContribution changes;
  @MockitoBean private ReadOwnContributions reads;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private PlatformTransactionManager transactions;

  /**
   * Supplies ordinary current admission; individual tests retain authority over business outcomes.
   */
  @BeforeEach
  void admission() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(OWNER));
  }

  @ParameterizedTest
  @CsvSource({"true,201", "false,200"})
  @DisplayName("Returns completed creation or current repetition with the exact version identity")
  void createsOrRecognizes(boolean created, int status) throws Exception {
    // Given
    when(submissions.submit(any(), any(), any(), any(), anyBoolean()))
        .thenReturn(new SubmitContribution.Outcome(version(), "1", created));

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"0\",\"url\":\"https://youtube.com/synthetic\"}"));

    // Then
    response
        .andExpect(status().is(status))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.contribution.id").value(VERSION.toString()))
        .andExpect(jsonPath("$.revision").value("1"));
    if (created) response.andExpect(header().string("Location", PATH + "/" + VERSION));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":null,\"url\":\"https://youtube.com/a\"}",
        "{\"revision\":\"0\",\"url\":null}",
        "{\"revision\":\"0\",\"url\":\"https://youtube.com/a\",\"unexpected\":true}"
      })
  @DisplayName("Rejects missing null and unknown command properties before submission")
  void rejectsInvalidBody(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH).with(mobile()).contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(submissions);
  }

  @ParameterizedTest
  @CsvSource({
    "STALE_REVISION,409",
    "NOT_OWNER,403",
    "FORBIDDEN,403",
    "ACCOUNT_TOO_YOUNG,422",
    "INVALID_ADDRESS,422",
    "ACCOUNT_AGE_UNKNOWN,503",
    "MATCH_UNAVAILABLE,404"
  })
  @DisplayName("Translates safe current policy refusals into canonical private errors")
  void translatesRefusal(Status refusal, int code) throws Exception {
    // Given
    when(submissions.submit(any(), any(), any(), any(), anyBoolean()))
        .thenThrow(new ContributionRejectedException(refusal));

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"0\",\"url\":\"https://youtube.com/synthetic\"}"));

    // Then
    response
        .andExpect(status().is(code))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.status").value(code));
  }

  @Test
  @DisplayName("Requires authentication before invoking a submission")
  void requiresAuthentication() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"revision\":\"0\",\"url\":\"https://youtube.com/a\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(submissions);
  }

  @Test
  @DisplayName("Refuses an intent addressed to another original account")
  void rejectsForeignOwner() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH.replace(OWNER.toString(), VERSION.toString()))
            .with(mobile())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"revision\":\"0\",\"url\":\"https://youtube.com/a\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(submissions);
  }

  @Test
  @DisplayName("Rejects unsupported body media without business effects")
  void rejectsMediaType() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH).with(mobile()).contentType(MediaType.TEXT_PLAIN).content("synthetic");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnsupportedMediaType());
    verifyNoInteractions(submissions);
  }

  @Test
  @DisplayName("Hides a missing or foreign member through the real generated GET")
  void hidesMissingMember() throws Exception {
    // Given
    when(reads.member(OWNER, MATCH, VERSION)).thenThrow(new SportingResourceNotFoundException());

    // When
    ResultActions response = mvc.perform(get(PATH + "/" + VERSION).with(mobile()));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("An unrelated administrative role does not grant stream publication")
  void rejectsUnprivilegedModerator() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/administration/matches/" + MATCH + "/stream-contributions")
            .with(mobile())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"actorAccountId\":\""
                    + OWNER
                    + "\",\"revision\":\"0\",\"url\":\"https://youtube.com/a\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(submissions);
  }

  @Test
  @DisplayName("Returns the owner collection with current eligibility and quota")
  void readsOwnCollection() throws Exception {
    // Given
    ReadOwnContributions.Page page =
        new ReadOwnContributions.Page(
            "1",
            Status.PENDING,
            true,
            null,
            new com.blockout.backend.contributions.domain.ContributionQuota.Usage(1, 1, true),
            Instant.parse("2026-10-24T22:00:00Z"),
            1,
            version(),
            new com.blockout.backend.contributions.application.ContributionStore.VersionPage(
                List.of(version()), false),
            0);
    when(reads.read(OWNER, MATCH, 0)).thenReturn(page);

    // When
    ResultActions response = mvc.perform(get(PATH).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.eligibility.requiresApproval").value(true))
        .andExpect(jsonPath("$.quota.versionsUsed").value(1))
        .andExpect(jsonPath("$.proposalCount").value(1))
        .andExpect(jsonPath("$.activeContribution.id").value(VERSION.toString()))
        .andExpect(jsonPath("$.items[0].url").value("https://youtube.com/synthetic"))
        .andExpect(jsonPath("$.nextPage").doesNotExist());
  }

  @Test
  @DisplayName("Returns the exact current owner member with its match revision")
  void readsOwnMember() throws Exception {
    // Given
    when(reads.member(OWNER, MATCH, VERSION))
        .thenReturn(new ReadOwnContributions.Detail("1", version()));

    // When
    ResultActions response = mvc.perform(get(PATH + "/" + VERSION).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.contribution.id").value(VERSION.toString()));
  }

  @Test
  @DisplayName("Creates a direct moderator publication with its administrative member Location")
  void publishesAsModerator() throws Exception {
    // Given
    when(permissions.findByAccountId(OWNER))
        .thenReturn(
            java.util.Set.of(com.blockout.backend.access.domain.Permission.MODERATE_STREAM_LINKS));
    when(submissions.submit(any(), any(), any(), any(), anyBoolean()))
        .thenReturn(new SubmitContribution.Outcome(version(), "1", true));
    when(accounts.displayName(OWNER)).thenReturn("Synthetic");

    // When
    ResultActions response =
        mvc.perform(
            post("/administration/matches/" + MATCH + "/stream-contributions")
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"actorAccountId\":\""
                        + OWNER
                        + "\",\"revision\":\"0\",\"url\":\"https://youtube.com/a\"}"));

    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(
            header()
                .string(
                    "Location",
                    "/administration/matches/" + MATCH + "/stream-contributions/" + VERSION))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.contribution.authorName").value("Synthetic"))
        .andExpect(jsonPath("$.contribution.decisions[0].kind").value("publish"));
  }

  @Test
  @DisplayName("Translates a known storage acquisition outage into a safe unavailable response")
  void reportsStorageOutage() throws Exception {
    // Given
    when(submissions.submit(any(), any(), any(), any(), anyBoolean()))
        .thenThrow(new DataAccessResourceFailureException("Controlled storage outage"));

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"0\",\"url\":\"https://youtube.com/a\"}"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"));
  }

  @Test
  @DisplayName("An audience change is a safe conflict without a mutation replay")
  void reportsAudienceConflict() throws Exception {
    // Given
    when(submissions.submit(any(), any(), any(), any(), anyBoolean()))
        .thenThrow(
            new com.blockout.backend.notifications.application
                .AnnouncementAudienceChangedException());

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"0\",\"url\":\"https://youtube.com/a\"}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"));
  }

  /**
   * Supplies a validated mobile authentication; signature/environment qualification is in
   * ContributionAccessTest.
   */
  private RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("subject")
                    .claim("azp", "mobile-test")
                    .claim("roles", "administrator"));
  }

  /**
   * Supplies one coherent already-accepted version, keeping the tested response identity explicit.
   */
  private ContributionVersion version() {
    Instant now = Instant.parse("2026-10-24T12:00:00Z");
    return new ContributionVersion(
        VERSION,
        MATCH,
        new StreamAddress("https://youtube.com/synthetic"),
        OWNER,
        ContributionVersion.State.ACTIVE,
        now,
        true,
        null,
        null,
        new ContributionVersion.Decision(ContributionVersion.DecisionKind.PUBLICATION, now, OWNER),
        null);
  }
}
