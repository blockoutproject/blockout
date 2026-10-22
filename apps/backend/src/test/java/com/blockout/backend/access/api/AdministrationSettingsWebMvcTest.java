package com.blockout.backend.access.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.AccessSettingsStore;
import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.application.ReadAccessConfiguration;
import com.blockout.backend.access.application.UpdateAccessSettings;
import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.TransactionSystemException;

/**
 * Real generated MVC binding, mapping and use cases; persistence and current-action checks are
 * controlled.
 */
@WebMvcTest(AdministrationSettingsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  AccessSettingsExceptionHandler.class,
  AccessApiMapperImpl.class,
  UpdateAccessSettings.class,
  ReadAccessConfiguration.class
})
@DisplayName("Atomic administration settings HTTP")
@ExtendWith(OutputCaptureExtension.class)
class AdministrationSettingsWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000175");
  @Autowired private MockMvc mvc;
  @MockitoBean private CurrentAccount account;
  @MockitoBean private ActionAuthorization authorization;
  @MockitoBean private AccessSettingsStore store;

  @ParameterizedTest
  @ValueSource(strings = {"/administration/maintenance", "/administration/application-versions"})
  @DisplayName("Requires mobile authentication before any settings read")
  void requiresAuthentication(String path) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path);

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Checks the independent maintenance grant before reading content")
  void refusesMaintenanceWithoutGrant() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    doThrow(new AccessDeniedException("denied"))
        .when(authorization)
        .require(ID, Permission.MANAGE_MAINTENANCE);

    // When
    mvc.perform(get("/administration/maintenance").with(mobile()))
        // Then
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:forbidden"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Requires a separate versions grant")
  void refusesVersionsWithoutGrant() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    doThrow(new AccessDeniedException("denied"))
        .when(authorization)
        .require(ID, Permission.MANAGE_APPLICATION_VERSIONS);

    // When
    mvc.perform(get("/administration/application-versions").with(mobile()))
        // Then
        .andExpect(status().isForbidden());
    verifyNoInteractions(store);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":null}",
        "{\"revision\":-1}",
        "{\"revision\":9007199254740992}",
        "{\"revision\":0.5}",
        "{\"revision\":\"0\"}",
        "{\"revision\":0,\"active\":true}",
        "{\"revision\":0,\"message\":null}"
      })
  @DisplayName("Rejects invalid maintenance shapes before use-case effects")
  void rejectsMaintenanceShape(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch("/administration/maintenance")
            .with(mobile())
            .contentType(MediaType.APPLICATION_JSON)
            .content(body);

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(store);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":0,\"ios\":null}",
        "{\"revision\":0,\"ios\":{\"future\":true}}",
        "{\"revision\":0,\"future\":true}"
      })
  @DisplayName("Rejects unknown and null platform request objects")
  void rejectsVersionShape(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch("/administration/application-versions")
            .with(mobile())
            .contentType(MediaType.APPLICATION_JSON)
            .content(body);

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isBadRequest());
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Returns a complete private group and the advertised PATCH media type")
  void readsStoredMaintenance() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    when(store.maintenance()).thenReturn(new MaintenanceSettings(4, false, "Prepared", null));

    // When
    mvc.perform(get("/administration/maintenance").with(mobile()))
        // Then
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(
            content()
                .json(
                    "{\"revision\":4,\"active\":false,\"message\":\"Prepared\",\"imageUrl\":null}"));
  }

  @Test
  @DisplayName("Preserves omission while removing an explicitly null optional image")
  void clearsOptionalImage() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    MaintenanceSettings current =
        new MaintenanceSettings(
            2, true, "Stored", "https://assets.example.invalid/maintenance.png");
    when(store.maintenanceForChange()).thenReturn(current);
    when(store.saveMaintenance(any())).thenAnswer(call -> call.getArgument(0));

    // When
    mvc.perform(
            patch("/administration/maintenance")
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":2,\"imageUrl\":null}"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").value("Stored"))
        .andExpect(jsonPath("$.active").value(true))
        .andExpect(jsonPath("$.imageUrl").isEmpty());
  }

  @Test
  @DisplayName("Returns 409 for a stale no-op rather than HTTP precondition failure")
  void rejectsStaleNoop() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    when(store.maintenanceForChange())
        .thenReturn(new MaintenanceSettings(2, false, "Stored", null));

    // When
    mvc.perform(
            patch("/administration/maintenance")
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":1,\"message\":\"Stored\"}"))
        // Then
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));
    verify(store, never()).saveMaintenance(any());
  }

  @Test
  @DisplayName("Refuses a whole resulting group with a minimum but no store link")
  void refusesInvalidResult() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    when(store.versionsForChange()).thenReturn(emptyVersions());

    // When
    mvc.perform(
            patch("/administration/application-versions")
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"ios\":{\"minimumVersion\":\"2.0.0\"}}"))
        // Then
        .andExpect(status().isUnprocessableContent())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unprocessable-content"));
    verify(store, never()).saveVersions(any());
  }

  @Test
  @DisplayName("Sets desired activation without replacing content")
  void setsDesiredActivation() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    when(store.maintenanceForChange())
        .thenReturn(new MaintenanceSettings(0, false, "Stored", null));
    when(store.saveMaintenance(any())).thenAnswer(call -> call.getArgument(0));

    // When
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"active\":true}"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.active").value(true))
        .andExpect(jsonPath("$.message").value("Stored"));
  }

  @Test
  @DisplayName("Refuses unsupported PATCH media without effects")
  void rejectsUnsupportedMedia() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        patch("/administration/maintenance")
            .with(mobile())
            .contentType("application/merge-patch+json")
            .content("{\"revision\":0}");

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Returns both complete platform settings with explicit nulls")
  void readsCompleteVersions() throws Exception {
    // Given
    when(account.id()).thenReturn(ID);
    when(store.versions()).thenReturn(emptyVersions());

    // When
    mvc.perform(get("/administration/application-versions").with(mobile()))
        // Then
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(
            content()
                .json(
                    "{\"revision\":0,\"ios\":{\"minimumVersion\":null,\"storeUrl\":null},\"android\":{\"minimumVersion\":null,\"storeUrl\":null},\"message\":null}"));
  }

  @Test
  @DisplayName("Anonymous complete reads hide all prepared inactive maintenance content")
  void hidesPreparedContent() throws Exception {
    // Given
    when(store.readComplete())
        .thenReturn(
            new ReadAccessConfiguration.Snapshot(
                new MaintenanceSettings(
                    3, false, "Private preparation", "https://assets.example.invalid/a.png"),
                emptyVersions()));

    // When
    mvc.perform(get("/application-access"))
        // Then
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.maintenance.revision").value(3))
        .andExpect(jsonPath("$.maintenance.message").isEmpty())
        .andExpect(jsonPath("$.maintenance.imageUrl").isEmpty())
        .andExpect(jsonPath("$.versions.ios.minimumVersion").isEmpty());
    verifyNoInteractions(account, authorization);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"configuration_unavailable", "database_unavailable", "transaction_failed"})
  @DisplayName("Unavailable settings produce a safe diagnostic and never fabricate maintenance")
  void refusesUnavailableSettings(String reason, CapturedOutput output) throws Exception {
    // Given
    String privateDetails = "https://private.example.invalid/image?token=private-test-value";
    RuntimeException failure =
        switch (reason) {
          case "database_unavailable" -> new DataAccessResourceFailureException(privateDetails);
          case "transaction_failed" -> new TransactionSystemException(privateDetails);
          default ->
              new AccessSettingsUnavailableException(new IllegalArgumentException(privateDetails));
        };
    when(store.readComplete()).thenThrow(failure);

    // When
    mvc.perform(get("/application-access"))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.maintenance").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
    assertThat(output.getOut())
        .contains("\"operation\":\"access_settings\"", "\"reason\":\"" + reason + "\"")
        .doesNotContain(privateDetails, "private-test-value");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":0}",
        "{\"revision\":0,\"active\":null}",
        "{\"revision\":0,\"active\":true,\"message\":\"Unwanted content\"}"
      })
  @DisplayName("Activation requires a desired boolean and cannot accept content fields")
  void refusesInvalidActivation(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        put("/administration/maintenance/activation")
            .with(mobile())
            .contentType(MediaType.APPLICATION_JSON)
            .content(body);

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().isBadRequest());
    verifyNoInteractions(store);
  }

  /** Supplies the actual mobile security claim without granting any business permission. */
  private static RequestPostProcessor mobile() {
    return jwt().jwt(token -> token.claim("azp", "mobile-test"));
  }

  /** Represents an initially unconfigured versions group without inventing platform defaults. */
  private static ApplicationVersionSettings emptyVersions() {
    return new ApplicationVersionSettings(
        0,
        new ApplicationVersionSettings.Platform(null, null),
        new ApplicationVersionSettings.Platform(null, null),
        null);
  }
}
