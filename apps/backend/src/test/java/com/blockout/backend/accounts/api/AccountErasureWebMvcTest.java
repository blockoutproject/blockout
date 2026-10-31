package com.blockout.backend.accounts.api;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.accounts.application.ChangeAccountProfile;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.ProfilePhotoPreparation;
import com.blockout.backend.accounts.application.ReadAccount;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Generated DELETE transport/admission; actual commits and provider effects have SQL integration.
 */
@WebMvcTest(AccountsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  AccountExceptionHandler.class,
  AccountRequest.class
})
@DisplayName("Original account DELETE HTTP boundary")
class AccountErasureWebMvcTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final UUID ORIGINAL = UUID.fromString("00000000-0000-4000-8000-000000000280");
  @Autowired private MockMvc mvc;
  @MockitoBean private EraseAccount erasure;
  @MockitoBean private EstablishAccount establishment;
  @MockitoBean private ReadAccount reads;
  @MockitoBean private ChangeAccountProfile changes;
  @MockitoBean private AccountApiMapper mapper;
  @MockitoBean private ProfilePhotoPreparation photos;
  @MockitoBean private MaintenanceAdmission admission;

  @Test
  @DisplayName("Returns bodyless no-store 204 after the erasure operation completes")
  void returnsNoContent() throws Exception {
    // Given
    RequestPostProcessor owner = principal();

    // When
    ResultActions response = mvc.perform(delete("/accounts/{id}", ORIGINAL).with(owner));

    // Then
    response
        .andExpect(status().isNoContent())
        .andExpect(content().string(""))
        .andExpect(header().string("Cache-Control", "no-store"));
    verify(erasure).erase(ISSUER, "auth0|original", ORIGINAL);
    verify(admission).requireOrdinaryAccess(ISSUER, "auth0|original", false);
  }

  @Test
  @DisplayName("Original absence has the canonical opaque 404")
  void returnsOriginalAbsence() throws Exception {
    // Given
    doThrow(new AccountNotFoundException()).when(erasure).erase(ISSUER, "auth0|original", ORIGINAL);

    // When
    ResultActions response = mvc.perform(delete("/accounts/{id}", ORIGINAL).with(principal()));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads, establishment, changes);
  }

  @Test
  @DisplayName("Local transaction failure returns a safe unavailable response")
  void reportsDefiniteLocalFailure() throws Exception {
    // Given
    doThrow(new DataAccessResourceFailureException("synthetic-private-sql"))
        .when(erasure)
        .erase(ISSUER, "auth0|original", ORIGINAL);

    // When
    ResultActions response = mvc.perform(delete("/accounts/{id}", ORIGINAL).with(principal()));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("synthetic-private-sql"))))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("A personal bypass admitted for another lifecycle cannot delete the old UUID")
  void refusesReplacementBypass() throws Exception {
    // Given
    when(admission.requireOrdinaryAccess(ISSUER, "auth0|original", true))
        .thenReturn(Optional.of(UUID.fromString("00000000-0000-4000-8000-000000000281")));

    // When
    ResultActions response =
        mvc.perform(
            delete("/accounts/{id}", ORIGINAL)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal()));

    // Then
    response.andExpect(status().isNotFound());
    verifyNoInteractions(erasure);
  }

  @Test
  @DisplayName("Current admission refusal never dispatches erasure")
  void refusesCurrentAdmission() throws Exception {
    // Given
    doThrow(new AccessDeniedException("private"))
        .when(admission)
        .requireOrdinaryAccess(ISSUER, "auth0|original", false);

    // When
    ResultActions response = mvc.perform(delete("/accounts/{id}", ORIGINAL).with(principal()));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(erasure);
  }

  @Test
  @DisplayName("Anonymous deletion is unauthorized without effects")
  void refusesAnonymous() throws Exception {
    // Given
    UUID target = ORIGINAL;

    // When
    ResultActions response = mvc.perform(delete("/accounts/{id}", target));

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(erasure);
  }

  /**
   * @return synthetic validated mobile identity without any fixed authentication-age requirement
   */
  private static RequestPostProcessor principal() {
    return jwt()
        .jwt(token -> token.issuer(ISSUER).subject("auth0|original").claim("azp", "mobile-test"));
  }
}
