package com.blockout.backend.contributions.api;

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
import com.blockout.backend.contributions.application.ContributionConflictException;
import com.blockout.backend.contributions.application.ReadOwnReport;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.shared.http.ApiExceptionHandler;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Real generated JSON, original-account scope and ordinary admission with controlled report owners.
 */
@WebMvcTest(ContributionReportsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  ContributionExceptionHandler.class,
  ContributionRequest.class,
  CurrentAccount.class,
  MaintenanceAdmission.class,
  ActionAuthorization.class,
  CurrentPermissions.class
})
@DisplayName("Contribution reports HTTP")
class ContributionReportsWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID VERSION = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final String PATH =
      "/accounts/" + ACCOUNT + "/stream-contributions/" + VERSION + "/report";
  @Autowired private MockMvc mvc;
  @MockitoBean private ReportContribution reports;
  @MockitoBean private ReadOwnReport reads;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private PlatformTransactionManager transactions;

  /**
   * Admits the existing original account; scenarios own maintenance and decisive request values.
   */
  @BeforeEach
  void admission() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"reason\":null}",
        "{\"reason\":\"\"}",
        "{\"reason\":1}",
        "{\"reason\":\"Reason\",\"revision\":\"invented\"}"
      })
  @DisplayName("Rejects malformed or noncanonical commands before the application")
  void rejectsInvalidInput(String body) throws Exception {
    // Given / When
    ResultActions response =
        mvc.perform(
            post(PATH).with(mobile()).contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reports, reads);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Creation identifies its exact report resource while duplicates stay 200")
  void returnsCurrentState(boolean created) throws Exception {
    // Given
    when(reports.report(ACCOUNT, VERSION, "Reason")).thenReturn(created);

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Reason\"}"));

    // Then
    response
        .andExpect(status().is(created ? 201 : 200))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.reported").value(true))
        .andExpect(jsonPath("$.reason").doesNotExist());
    if (created) response.andExpect(header().string("Location", PATH));
    else response.andExpect(header().doesNotExist("Location"));
  }

  @Test
  @DisplayName("An own-state read exposes neither reason nor another reporter")
  void readsOwnState() throws Exception {
    // Given
    when(reads.read(ACCOUNT, VERSION)).thenReturn(false);

    // When
    ResultActions response = mvc.perform(get(PATH).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.reported").value(false))
        .andExpect(jsonPath("$.reason").doesNotExist())
        .andExpect(jsonPath("$.reporterId").doesNotExist());
  }

  @Test
  @DisplayName("A foreign original account cannot send a report")
  void refusesForeignAccount() throws Exception {
    // Given / When
    ResultActions response =
        mvc.perform(
            post(PATH.replace(ACCOUNT.toString(), VERSION.toString()))
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Reason\"}"));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(reports, reads);
  }

  @Test
  @DisplayName("Guests cannot report")
  void refusesGuest() throws Exception {
    // Given / When
    ResultActions response =
        mvc.perform(
            post(PATH).contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Reason\"}"));

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(reports, reads);
  }

  @Test
  @DisplayName("Maintenance does not confer an implicit reporting bypass")
  void refusesMaintenance() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Maintenance", null));

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Reason\"}"));

    // Then
    response.andExpect(status().isServiceUnavailable());
    verifyNoInteractions(reports, reads);
  }

  @Test
  @DisplayName("Inactive new reports return the canonical conflict")
  void returnsConflict() throws Exception {
    // Given
    when(reports.report(ACCOUNT, VERSION, "Reason")).thenThrow(new ContributionConflictException());

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Reason\"}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"));
  }

  /**
   * Supplies a validated mobile principal; cryptographic/token-environment proofs remain with F05.
   */
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
