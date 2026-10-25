package com.blockout.backend.accounts.api;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.ReadAccount;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.CannotCreateTransactionException;

/**
 * Real generated controller/mapper/read boundary, with controlled F12 admission and persistence.
 */
@WebMvcTest(AccountsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  AccountExceptionHandler.class,
  ReadAccount.class,
  AccountApiMapperImpl.class
})
@DisplayName("Explicit account access HTTP boundary")
class AccountAccessWebMvcTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000169");
  private static final Account ACCOUNT =
      new Account(ID, ISSUER, "auth0|one", "Player_169", "shared@example.invalid", null);
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountStore store;
  @MockitoBean private EstablishAccount establishment;
  @MockitoBean private com.blockout.backend.accounts.application.ChangeAccountProfile changes;
  @MockitoBean private com.blockout.backend.accounts.infrastructure.ProfilePhotoProcessor photos;
  @MockitoBean private CurrentPermissions permissions;
  @MockitoBean private MaintenanceAdmission admission;

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Establishes explicitly with canonical status and generated current permissions")
  void establishesExplicitly(boolean created) throws Exception {
    // Given
    when(establishment.establish(ISSUER, "auth0|one"))
        .thenReturn(
            new EstablishAccount.Outcome(
                new ReadAccount.View(ACCOUNT, false, Set.of(Permission.MANAGE_MAINTENANCE)),
                created));

    // When
    ResultActions response = mvc.perform(post("/accounts").with(principal("mobile-test")));

    // Then
    response
        .andExpect(status().is(created ? 201 : 200))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.accountId").value(ID.toString()))
        .andExpect(jsonPath("$.username").value("Player_169"))
        .andExpect(jsonPath("$.principalCreatedAt").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.hasPhoto").value(false))
        .andExpect(jsonPath("$.permissions.manageMaintenance").value(true))
        .andExpect(jsonPath("$.permissions.moderateStreamLinks").value(false));
    if (created) response.andExpect(header().string("Location", "/accounts/" + ID));
    else response.andExpect(header().doesNotExist("Location"));
    verify(admission).requireOrdinaryAccess(ISSUER, "auth0|one", false);
    verifyNoInteractions(store, permissions);
  }

  @Test
  @DisplayName("Reads locally during controlled maintenance without establishing or synchronizing")
  void readsCurrentForIdentification() throws Exception {
    // Given
    when(store.findByPrincipal(ISSUER, "auth0|one")).thenReturn(Optional.of(ACCOUNT));
    when(permissions.forAccount(ID)).thenReturn(Set.of());

    // When
    mvc.perform(get("/accounts/me").with(principal("mobile-test")))
        // Then
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(establishment, admission);
  }

  @Test
  @DisplayName("Returns 404 on an unknown current account without establishing it")
  void leavesUnknownAbsent() throws Exception {
    // Given
    when(store.findByPrincipal(ISSUER, "auth0|one")).thenReturn(Optional.empty());

    // When
    mvc.perform(get("/accounts/me").with(principal("mobile-test")))
        // Then
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(establishment);
  }

  @ParameterizedTest
  @ValueSource(strings = {"database", "transaction"})
  @DisplayName("Reports unavailable account storage with the canonical non-cacheable 503")
  void reportsUnavailableStorage(String boundary) throws Exception {
    // Given
    RuntimeException failure =
        boundary.equals("database")
            ? new DataAccessResourceFailureException("Synthetic private connection details")
            : new CannotCreateTransactionException("Synthetic private connection details");
    when(store.findByPrincipal(ISSUER, "auth0|one")).thenThrow(failure);

    // When
    mvc.perform(get("/accounts/me").with(principal("mobile-test")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.status").value(503))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(establishment, admission);
  }

  @Test
  @DisplayName("Keeps unexpected storage integrity failures distinct from temporary unavailability")
  void preservesUnexpectedIntegrityFailure() throws Exception {
    // Given
    when(store.findByPrincipal(ISSUER, "auth0|one"))
        .thenThrow(new DataIntegrityViolationException("Synthetic private constraint details"));

    // When
    mvc.perform(get("/accounts/me").with(principal("mobile-test")))
        // Then
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.type").value("about:blank"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(establishment, admission);
  }

  @Test
  @DisplayName("Hides another principal's original UUID")
  void hidesAnotherOwner() throws Exception {
    // Given
    when(store.findById(ID))
        .thenReturn(
            Optional.of(
                new Account(
                    ID, ISSUER, "auth0|other", "Other_player", "shared@example.invalid", null)));

    // When
    mvc.perform(get("/accounts/" + ID).with(principal("mobile-test")))
        // Then
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(permissions, establishment);
  }

  @Test
  @DisplayName("Applies ordinary admission to original reads and establishment only")
  void requiresOrdinaryAdmission() throws Exception {
    // Given
    doThrow(new AccountUnavailableException())
        .when(admission)
        .requireOrdinaryAccess(ISSUER, "auth0|one", false);

    // When
    mvc.perform(post("/accounts").with(principal("mobile-test")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"));
    mvc.perform(get("/accounts/" + ID).with(principal("mobile-test")))
        .andExpect(status().isServiceUnavailable());
    verifyNoInteractions(store, establishment);
  }

  @ParameterizedTest
  @ValueSource(strings = {"collector-test", "foreign-mobile"})
  @DisplayName("Refuses collector or wrong-client credentials before account effects")
  void rejectsWrongClient(String client) throws Exception {
    // Given
    RequestPostProcessor credentials = principal(client);

    // When
    ResultActions response = mvc.perform(post("/accounts").with(credentials));

    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store, establishment, admission);
  }

  @Test
  @DisplayName("Refuses visitors before account effects")
  void rejectsVisitors() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = post("/accounts");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnauthorized()).andExpect(header().exists("WWW-Authenticate"));
    verifyNoInteractions(store, establishment, admission);
  }

  @Test
  @DisplayName("Refuses invalid bearers before account effects")
  void rejectsInvalidBearer() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get("/accounts/me").header("Authorization", "Bearer invalid");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store, establishment, admission);
  }

  @Test
  @DisplayName("Reads the owner's original resource with current photo presence")
  void readsOriginalOwner() throws Exception {
    // Given
    when(store.findById(ID)).thenReturn(Optional.of(ACCOUNT));
    when(store.hasPhoto(ID)).thenReturn(true);
    when(permissions.forAccount(ID)).thenReturn(Set.of());

    // When
    mvc.perform(get("/accounts/" + ID).with(principal("mobile-test")))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hasPhoto").value(true))
        .andExpect(header().string("Accept-Patch", "multipart/form-data"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(establishment);
  }

  @Test
  @DisplayName("Reports an unavailable establishment without announcing a usable account")
  void reportsUnavailableEstablishment() throws Exception {
    // Given
    when(establishment.establish(ISSUER, "auth0|one")).thenThrow(new AccountUnavailableException());

    // When
    mvc.perform(post("/accounts").with(principal("mobile-test")))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"));
    verifyNoInteractions(store, permissions);
  }

  @Test
  @DisplayName("Returns the canonical missing-provider-email refusal without private details")
  void reportsMissingInitialEmail() throws Exception {
    // Given
    when(establishment.establish(ISSUER, "auth0|one"))
        .thenThrow(new ProviderEmailUnavailableException());

    // When
    mvc.perform(post("/accounts").with(principal("mobile-test")))
        // Then
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:provider-email-unavailable"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store, permissions);
  }

  @Test
  @DisplayName("Forwards explicit bypass intent to the controlled admission owner")
  void forwardsBypassIntent() throws Exception {
    // Given
    doThrow(new AccountUnavailableException())
        .when(admission)
        .requireOrdinaryAccess(ISSUER, "auth0|one", true);

    // When
    mvc.perform(
            post("/accounts")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(principal("mobile-test")))
        // Then
        .andExpect(status().isServiceUnavailable());
    verify(admission).requireOrdinaryAccess(ISSUER, "auth0|one", true);
    verifyNoInteractions(establishment);
  }

  @Test
  @DisplayName("Rejects a malformed original identifier with canonical non-cacheable validation")
  void rejectsMalformedOriginal() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/accounts/invalid").with(principal("mobile-test"));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store, establishment);
  }

  /**
   * Supplies validated synthetic JWTs only for this MVC slice; the real signature suite owns trust
   * validation.
   *
   * @param client scenario-owned allowed or refused client identifier
   * @return controlled JWT request postprocessor
   */
  private static RequestPostProcessor principal(String client) {
    return jwt()
        .jwt(token -> token.issuer(ISSUER).subject("auth0|one").claim("azp", client))
        .authorities(new SimpleGrantedAuthority("SCOPE_openid"));
  }
}
