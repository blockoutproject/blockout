package com.blockout.backend.contributions.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import com.blockout.backend.contributions.application.ContributionConflictException;
import com.blockout.backend.contributions.application.ContributionRejectedException;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.application.SubmitModeratedContribution;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.generated.mobile.model.StreamOwnerActionEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.time.Instant;
import java.util.Optional;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;

/** Real generated binding and current HTTP admission with application writes controlled. */
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
@DisplayName("Own contribution lifecycle HTTP")
class OwnContributionLifecycleWebMvcTest {
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID VERSION = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final String PATH =
      "/accounts/" + OWNER + "/matches/" + MATCH + "/stream-contributions/" + VERSION;
  @Autowired private MockMvc mvc;
  @MockitoBean private SubmitContribution submissions;
  @MockitoBean private ChangeOwnContribution changes;
  @MockitoBean private ReadOwnContributions reads;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private PlatformTransactionManager transactions;

  /** Supplies admitted original identity; each scenario owns its decisive request or refusal. */
  @BeforeEach
  void admission() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(OWNER));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":null,\"action\":\"cancel\"}",
        "{\"revision\":\"1\",\"action\":null}",
        "{\"revision\":\"\",\"action\":\"cancel\"}",
        "{\"revision\":1,\"action\":\"cancel\"}",
        "{\"revision\":\"1\",\"action\":\"approve\"}",
        "{\"revision\":\"1\",\"action\":\"cancel\",\"url\":\"https://youtu.be/changed\"}"
      })
  @DisplayName("Rejects malformed atomic commands before any application write")
  void rejectsInvalidCommand(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch(PATH).with(mobile()).contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(changes, submissions, reads);
  }

  @Test
  @DisplayName("Rejects a path captured for another original account")
  void refusesForeignPath() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch(PATH.replace(OWNER.toString(), VERSION.toString()))
            .with(mobile())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"revision\":\"1\",\"action\":\"cancel\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(changes, submissions, reads);
  }

  @Test
  @DisplayName("Requires the atomic JSON media type")
  void rejectsUnsupportedMedia() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch(PATH)
            .with(mobile())
            .contentType("application/merge-patch+json")
            .content("{\"action\":\"cancel\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnsupportedMediaType());
    verifyNoInteractions(changes, submissions, reads);
  }

  @Test
  @DisplayName("Current maintenance refuses an owner command without an explicit permitted bypass")
  void refusesCurrentMaintenance() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Maintenance", null));

    // When
    ResultActions response =
        mvc.perform(
            patch(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"1\",\"action\":\"withdraw\"}"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    verifyNoInteractions(changes, submissions, reads);
  }

  @ParameterizedTest
  @ValueSource(strings = {"cancel", "withdraw"})
  @DisplayName("Returns the exact acknowledged version and current revision without a Location")
  void returnsExactAcknowledgement(String action) throws Exception {
    // Given
    StreamOwnerActionEnum command = StreamOwnerActionEnum.fromValue(action);
    ContributionVersion.State state =
        command == StreamOwnerActionEnum.CANCEL
            ? ContributionVersion.State.CANCELLED
            : ContributionVersion.State.WITHDRAWN;
    ContributionVersion version =
        new ContributionVersion(
            VERSION,
            MATCH,
            new StreamAddress("https://youtu.be/literal?keep=1#time"),
            OWNER,
            state,
            Instant.parse("2026-10-24T12:00:00Z"),
            true,
            null,
            null,
            null,
            null);
    when(changes.change(OWNER, MATCH, VERSION, "opaque:current", command))
        .thenReturn(new ReadOwnContributions.Detail("opaque:next", version));

    // When
    ResultActions response =
        mvc.perform(
            patch(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"opaque:current\",\"action\":\"" + action + "\"}"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(header().doesNotExist("Location"))
        .andExpect(jsonPath("$.revision").value("opaque:next"))
        .andExpect(jsonPath("$.contribution.id").value(VERSION.toString()))
        .andExpect(jsonPath("$.contribution.url").value("https://youtu.be/literal?keep=1#time"))
        .andExpect(jsonPath("$.contribution.canCancel").value(false))
        .andExpect(jsonPath("$.contribution.canWithdraw").value(false));
    verifyNoInteractions(submissions, reads);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Distinguishes stale revisions from incompatible lifecycle conflicts")
  void returnsCanonicalConflicts(boolean stale) throws Exception {
    // Given
    RuntimeException failure =
        stale
            ? new ContributionRejectedException(Status.STALE_REVISION)
            : new ContributionConflictException();
    when(changes.change(OWNER, MATCH, VERSION, "1", StreamOwnerActionEnum.CANCEL))
        .thenThrow(failure);

    // When
    ResultActions response =
        mvc.perform(
            patch(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"1\",\"action\":\"cancel\"}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(
            jsonPath("$.type")
                .value(
                    stale
                        ? "urn:blockout:problem:stale-revision"
                        : "urn:blockout:problem:conflict"));
  }

  @Test
  @DisplayName("A withdrawn maintenance bypass grant prevents a later owner action")
  void refusesRevokedBypass() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Maintenance", null));
    when(accounts.lock(OWNER)).thenReturn(true);
    when(permissions.findByAccountId(OWNER)).thenReturn(java.util.Set.of());

    // When
    ResultActions response =
        mvc.perform(
            patch(PATH)
                .with(mobile())
                .header("Blockout-Maintenance-Bypass", "true")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"1\",\"action\":\"withdraw\"}"));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(changes, submissions, reads);
  }

  /** Supplies an already validated mobile principal; cryptographic cases remain with F05/F12. */
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
