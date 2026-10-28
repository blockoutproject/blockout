package com.blockout.backend.support.api;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exercises shared HTTP security with a controlled F12 policy and dispatch-only probes, never a
 * support receipt. Actual expiry verification belongs to SecurityWebMvcTest; current SQL account
 * lifecycle/grant checks remain covered by F12's MaintenanceAdmissionIntegrationTest.
 */
@WebMvcTest(controllers = SupportAdmissionTest.Probe.class)
@Import({SecurityConfiguration.class, ApiExceptionHandler.class, SupportAdmissionTest.Probe.class})
@DisplayName("Support uses ordinary public admission and explicit F12 bypass")
class SupportAdmissionTest {
  @Autowired private MockMvc mvc;
  @MockitoBean private MaintenanceAdmission admission;

  @Test
  @DisplayName("Admits ordinary guests without treating declared identity as authentication")
  void admitsGuest() throws Exception {
    // Given
    String declared = "{\"accountId\":\"00000000-0000-4000-8000-000000000239\"}";

    // When
    mvc.perform(post("/support-requests").contentType("application/json").content(declared))
        // Then
        .andExpect(status().isNoContent());
    verify(admission).requireOrdinaryAccess(null, null, false);
  }

  @Test
  @DisplayName("Rejects an invalid supplied bearer even on the public support operation")
  void rejectsInvalidBearer() throws Exception {
    // Given / When
    mvc.perform(post("/support-requests").header("Authorization", "Bearer invalid"))
        // Then
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(admission);
  }

  @Test
  @DisplayName("Passes authenticated ordinary intent to the existing policy")
  void admitsOrdinaryPrincipal() throws Exception {
    // Given / When
    mvc.perform(post("/support-requests").with(jwt().jwt(token -> token.issuer("https://identity.example.invalid/").subject("support-user").claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isNoContent());
    verify(admission).requireOrdinaryAccess("https://identity.example.invalid/", "support-user", false);
  }

  @Test
  @DisplayName("Active maintenance suppresses ordinary support")
  void refusesMaintenance() throws Exception {
    // Given
    doThrow(new MaintenanceRequiredException(new MaintenanceSettings(7, true, "Pause", null)))
        .when(admission).requireOrdinaryAccess(nullable(String.class), nullable(String.class), anyBoolean());

    // When
    mvc.perform(post("/support-requests"))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
  }

  @Test
  @DisplayName("A guest cannot gain active bypass by declaring personal intent")
  void refusesUnauthenticatedBypass() throws Exception {
    // Given
    doThrow(new AccessDeniedException("Action is not permitted")).when(admission).requireOrdinaryAccess(null, null, true);

    // When
    mvc.perform(post("/support-requests").header("Blockout-Maintenance-Bypass", "true"))
        // Then
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("A revoked current grant refuses explicit bypass")
  void refusesRevokedBypass() throws Exception {
    // Given
    doThrow(new AccessDeniedException("Action is not permitted")).when(admission).requireOrdinaryAccess("https://identity.example.invalid/", "support-user", true);

    // When
    mvc.perform(post("/support-requests").header("Blockout-Maintenance-Bypass", "true").with(jwt().jwt(token -> token.issuer("https://identity.example.invalid/").subject("support-user").claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Usable authenticated bypass is still decided by the current F12 policy")
  void admitsCurrentBypass() throws Exception {
    // Given / When
    mvc.perform(post("/support-requests").header("Blockout-Maintenance-Bypass", "true").with(jwt().jwt(token -> token.issuer("https://identity.example.invalid/").subject("support-user").claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isNoContent());
    verify(admission).requireOrdinaryAccess("https://identity.example.invalid/", "support-user", true);
  }

  @Test
  @DisplayName("The independent application access check remains reachable")
  void preservesIndependentAccessCheck() throws Exception {
    // Given / When
    mvc.perform(get("/application-access"))
        // Then
        .andExpect(status().isNoContent());
    verifyNoInteractions(admission);
  }

  /** Dispatch evidence only; these test endpoints perform no support, provider or account effect. */
  @RestController
  static class Probe {
    /** Indicates only that support dispatch passed security, never that a request was received. */
    @PostMapping("/support-requests")
    ResponseEntity<Void> support() { return ResponseEntity.noContent().build(); }

    /** Indicates only that the independent access read passed security. */
    @GetMapping("/application-access")
    ResponseEntity<Void> access() { return ResponseEntity.noContent().build(); }
  }
}
