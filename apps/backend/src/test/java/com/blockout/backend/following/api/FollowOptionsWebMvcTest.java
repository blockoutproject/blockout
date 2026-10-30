package com.blockout.backend.following.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadFollowOptions.Options;
import com.blockout.backend.following.application.ReadFollowerCount;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.util.List;
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
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Production options route and original-owner/admission binding; application reads are controlled.
 */
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
  CurrentPermissions.class,
  FollowingApiMapperImpl.class,
  ConsultationApiMapperImpl.class
})
@DisplayName("Personal season options HTTP boundary")
class FollowOptionsWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString(FollowingContractWebMvcTest.ACCOUNT);
  private static final UUID SEASON = UUID.fromString(FollowingContractWebMvcTest.TARGET);
  @Autowired private MockMvc mvc;
  @MockitoBean private ReadFollowerCount counts;
  @MockitoBean private FollowState state;
  @MockitoBean private ReadFollowOptions options;
  @MockitoBean private ReadPersonalCalendar calendars;
  @MockitoBean private ReadFollowLists lists;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private PlatformTransactionManager transactions;

  /** Supplies ordinary admission without implying that an account lookup succeeded. */
  @BeforeEach
  void admission() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
  }

  @Test
  @DisplayName("Maps current seasons and the proposed UUID with no-store")
  void returnsOptions() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(options.read(ACCOUNT))
        .thenReturn(new Options(List.of(new SeasonView(SEASON, 2026, "2026/2027")), SEASON));

    // When
    ResultActions response = mvc.perform(get(path()).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.seasons[0].id").value(SEASON.toString()))
        .andExpect(jsonPath("$.seasons[0].startYear").value(2026))
        .andExpect(jsonPath("$.seasons[0].label").value("2026/2027"))
        .andExpect(jsonPath("$.defaultSeasonId").value(SEASON.toString()));
  }

  @Test
  @DisplayName("Omits the default when no eligible season exists")
  void emptyHasNoDefault() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(options.read(ACCOUNT)).thenReturn(new Options(List.of(), null));

    // When
    ResultActions response = mvc.perform(get(path()).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seasons").isEmpty())
        .andExpect(jsonPath("$.defaultSeasonId").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(strings = {"seasonId=00000000-0000-4000-8000-000000000001", "q=team", "page=0"})
  @DisplayName("Ignores undeclared options query fields")
  void ignoresQuery(String query) throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(options.read(ACCOUNT)).thenReturn(new Options(List.of(), null));
    MockHttpServletRequestBuilder request = get(path() + "?" + query).with(mobile());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Hides another original account even from an administrator")
  void hidesOtherOwner() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(UUID.fromString("00000000-0000-4000-8000-000000000227")));

    // When
    ResultActions response = mvc.perform(get(path()).with(mobile()));

    // Then
    response.andExpect(status().isNotFound());
    verifyNoInteractions(options);
  }

  @Test
  @DisplayName("Rejects a guest without reading private options")
  void rejectsGuest() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(options);
  }

  @Test
  @DisplayName("Returns an opaque unavailable response instead of an empty catalogue")
  void reportsUnavailableOptions() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(options.read(ACCOUNT))
        .thenThrow(new DataAccessResourceFailureException("private diagnostic"));

    // When
    ResultActions response = mvc.perform(get(path()).with(mobile()));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(jsonPath("$.seasons").doesNotExist());
  }

  @Test
  @DisplayName("Rejects another client audience before reading private options")
  void rejectsWrongClient() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get(path())
            .with(
                jwt()
                    .jwt(
                        token ->
                            token
                                .issuer("https://identity.example.invalid/")
                                .subject("subject")
                                .claim("azp", "ingestion-test")));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(options);
  }

  /** Provides a validated mobile principal; role grants no foreign-account authority. */
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

  /** Returns the sole current-owner options route. */
  private String path() {
    return "/accounts/" + ACCOUNT + "/follow-options";
  }
}
