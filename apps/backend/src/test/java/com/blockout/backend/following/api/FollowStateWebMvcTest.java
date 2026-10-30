package com.blockout.backend.following.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.Optional;
import java.util.Set;
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
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/** Actual member controller, generated DTOs, F05 identity and F12 admission; SQL is controlled. */
@WebMvcTest(FollowingController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  FollowingExceptionHandler.class,
  FollowingRequest.class,
  CurrentAccount.class,
  MaintenanceAdmission.class,
  ActionAuthorization.class,
  CurrentPermissions.class
})
@DisplayName("Canonical follow member state")
class FollowStateWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString(FollowingContractWebMvcTest.ACCOUNT);
  private static final UUID TARGET = UUID.fromString(FollowingContractWebMvcTest.TARGET);
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private MockMvc mvc;
  @MockitoBean private FollowState state;
  @MockitoBean private ReadFollowOptions options;
  @MockitoBean private ReadPersonalCalendar calendars;
  @MockitoBean private ReadFollowLists lists;
  @MockitoBean private FollowingApiMapper mapper;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private PlatformTransactionManager transactions;

  /**
   * Provides ordinary maintenance admission; owner lookup is stubbed only by admitted scenarios.
   */
  @BeforeEach
  void admission() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
  }

  @ParameterizedTest
  @CsvSource({"team,true", "team,false", "pool,true", "pool,false"})
  @DisplayName("Returns the confirmed boolean for a member read")
  void readsConfirmedState(String kind, boolean confirmed) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ACCOUNT));
    when(state.read(context(kind))).thenReturn(confirmed);

    // When
    ResultActions response = mvc.perform(get(path(kind)).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.following").value(confirmed));
  }

  @ParameterizedTest
  @CsvSource({"team,true,false", "team,false,true", "pool,true,false", "pool,false,true"})
  @DisplayName("Returns application confirmation rather than echoing the requested state")
  void replacesState(String kind, boolean requested, boolean confirmed) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ACCOUNT));
    when(state.replace(context(kind), requested)).thenReturn(confirmed);

    // When
    ResultActions response =
        mvc.perform(
            put(path(kind))
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"following\":" + requested + "}"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.following").value(confirmed));
    verify(state).replace(context(kind), requested);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "null",
        "{\"following\":null}",
        "{\"following\":1}",
        "{\"following\":\"true\"}",
        "{\"following\":true,\"accountId\":\"other\"}"
      })
  @DisplayName("Rejects incomplete or coerced bodies before mutation")
  void rejectsBody(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        put(path("team")).with(mobile()).contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(state);
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Rejects all member query properties for both GET and PUT")
  void rejectsQuery(String kind) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get(path(kind)).with(mobile()).param("seasonId", TARGET.toString());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());

    // When
    ResultActions secondResponse =
        mvc.perform(
            put(path(kind))
                .with(mobile())
                .param("following", "true", "false")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"following\":true}"));

    // Then
    secondResponse.andExpect(status().isBadRequest());
    verifyNoInteractions(state);
  }

  @Test
  @DisplayName("Rejects unsupported media before mutation")
  void rejectsMedia() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        put(path("pool")).with(mobile()).contentType(MediaType.TEXT_PLAIN).content("true");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unsupported-media-type"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(state);
  }

  @Test
  @DisplayName("Rejects guests and collector credentials without accessing personal state")
  void rejectsCredentials() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        put(path("team")).contentType(MediaType.APPLICATION_JSON).content("{\"following\":true}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control", "no-store"));

    // When
    ResultActions secondResponse =
        mvc.perform(
            get(path("team")).with(jwt().jwt(token -> token.claim("azp", "collector-test"))));

    // Then
    secondResponse
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(state, accounts);
  }

  @ParameterizedTest
  @ValueSource(strings = {"erased", "other", "replacement"})
  @DisplayName("Hides unavailable original accounts despite an administrator claim")
  void rejectsUnavailableOwner(String lifecycle) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject"))
        .thenReturn(lifecycle.equals("erased") ? Optional.empty() : Optional.of(TARGET));

    // When
    ResultActions response =
        mvc.perform(
            put(path("pool"))
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"following\":true}"));

    // Then
    response.andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").doesNotExist());
    verifyNoInteractions(state);
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Hides missing or currently hidden targets without unsafe details")
  void rejectsTarget(String kind) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ACCOUNT));
    when(state.replace(context(kind), true)).thenThrow(new FollowUnavailableTargetException());

    // When
    ResultActions response =
        mvc.perform(
            put(path(kind))
                .with(mobile())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"following\":true}"));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Translates storage unavailability into an opaque retryable read failure")
  void rejectsUnavailableStorage() throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ACCOUNT));
    when(state.read(any())).thenThrow(new DataAccessResourceFailureException("Private fixture"));

    // When
    ResultActions response = mvc.perform(get(path("team")).with(mobile()));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Requires a current explicit maintenance bypass for the original owner")
  void admitsExplicitBypass() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ACCOUNT));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT)).thenReturn(Set.of(Permission.BYPASS_MAINTENANCE));
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenReturn(new SimpleTransactionStatus());

    // When
    ResultActions response = mvc.perform(get(path("pool")).with(mobile()));

    // Then
    response.andExpect(status().isServiceUnavailable());
    verifyNoInteractions(state);

    // When
    ResultActions secondResponse =
        mvc.perform(get(path("pool")).with(mobile()).header("Blockout-Maintenance-Bypass", "true"));

    // Then
    secondResponse.andExpect(status().isOk());
    verify(state).read(context("pool"));
  }

  @Test
  @DisplayName("Rejects DELETE instead of exposing a toggle or alternate removal protocol")
  void rejectsDelete() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = delete(path("team")).with(mobile());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isMethodNotAllowed());
    verifyNoInteractions(state);
  }

  /** Supplies a validated mobile principal without granting another account's access. */
  private RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer(ISSUER)
                    .subject("subject")
                    .claim("azp", "mobile-test")
                    .claim("roles", "administrator"));
  }

  /**
   * Builds the exact typed member identity used by the generated route.
   *
   * @param kind canonical team or pool member kind
   * @return admitted original owner and target
   */
  private FollowContext context(String kind) {
    return new FollowContext(
        ACCOUNT, new Target(kind.equals("team") ? TargetType.TEAM : TargetType.POOL, TARGET));
  }

  /**
   * Builds the canonical original-account member path.
   *
   * @param kind canonical team or pool member kind
   * @return exact member route
   */
  private String path(String kind) {
    return "/accounts/" + ACCOUNT + "/" + kind + "-follows/" + TARGET;
  }
}
