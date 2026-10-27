package com.blockout.backend.search.api;

import static org.mockito.ArgumentMatchers.any;
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
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.search.application.ReadSearch;
import com.blockout.backend.search.application.ReadSearchOptions;
import com.blockout.backend.search.application.SearchOptions;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
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
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * Exercises the real discovery controller and F12 admission filter with controlled owner stores.
 * Native JWT signature validation and PostgreSQL locking remain their owners' integration evidence.
 */
@WebMvcTest(
    controllers = DiscoveryController.class,
    properties = {
      "blockout.security.issuer=https://identity.example.invalid/",
      "blockout.security.mobile-audience=mobile-test",
      "blockout.security.mobile-client-id=mobile-client",
      "blockout.security.ingestion-audience=collector-test",
      "blockout.security.ingestion-client-id=collector-client"
    })
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  DiscoveryWebConfiguration.class,
  ApiExceptionHandler.class,
  CurrentPermissions.class,
  ActionAuthorization.class,
  MaintenanceAdmission.class,
  DiscoveryRequest.class,
  DiscoveryApiMapperImpl.class,
  ConsultationApiMapperImpl.class
})
@DisplayName("Sporting search choices HTTP boundary")
class SearchOptionsWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PlatformTransactionManager transactions;
  @MockitoBean private ReadSearch reads;
  @MockitoBean private ReadSearchOptions options;

  /** Runs the real admission callback without claiming database transaction semantics. */
  @BeforeEach
  void supplyTransactionBoundary() {
    when(transactions.getTransaction(any()))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
  }

  @Test
  @DisplayName("Returns public current options with no-store")
  void returnsOptions() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));

    when(options.read(SearchResourceTypeEnum.TEAM))
        .thenReturn(
            new SearchOptions(
                SearchResourceTypeEnum.TEAM,
                List.of(new SeasonView(ACCOUNT, 2040, "2040/2041")),
                List.of(
                    new ConsultationViews.Division(ACCOUNT, "Nationale", null, "#112233", null)),
                List.of(SportFormatEnum.values()),
                List.of(SportGenderEnum.values())));

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.resourceType").value("team"))
        .andExpect(jsonPath("$.seasons[0].label").value("2040/2041"))
        .andExpect(jsonPath("$.divisions[0].name").value("Nationale"))
        .andExpect(jsonPath("$.divisions[0].color").value("#112233"))
        .andExpect(jsonPath("$.divisions[0].gradient").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.divisions[0].logoUrl").doesNotExist());
    verifyNoInteractions(accounts, permissions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Returns the exact requested sporting option kind")
  void returnsRequestedType(String type) throws Exception {
    // Given
    SearchResourceTypeEnum resource = SearchResourceTypeEnum.fromValue(type);
    when(options.read(resource))
        .thenReturn(
            new SearchOptions(
                resource,
                List.of(),
                List.of(),
                List.of(SportFormatEnum.values()),
                List.of(SportGenderEnum.values())));
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", type));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.resourceType").value(type));
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "club", "TEAM", "teams", "pool,team"})
  @DisplayName("Rejects missing or unsupported sporting type vocabulary")
  void rejectsInvalidType(String type) throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", type));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Requires one type and rejects unknown query criteria")
  void rejectsInvalidShape() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));

    // When
    ResultActions absent = mvc.perform(get("/sporting-search-options"));
    ResultActions repeated =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team", "pool"));
    ResultActions unknown =
        mvc.perform(
            get("/sporting-search-options").param("resourceType", "team").param("q", "ignored"));

    // Then
    absent.andExpect(status().isBadRequest());
    repeated.andExpect(status().isBadRequest());
    unknown.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"free", "pro", "unknown"})
  @DisplayName("Public options never wait for membership or current account reads")
  void admitsPublicRights(String entitlement) throws Exception {
    // Given
    when(options.read(SearchResourceTypeEnum.TEAM))
        .thenReturn(
            new SearchOptions(
                SearchResourceTypeEnum.TEAM,
                List.of(),
                List.of(),
                List.of(SportFormatEnum.values()),
                List.of(SportGenderEnum.values())));
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));

    // When
    ResultActions response =
        mvc.perform(
            get("/sporting-search-options")
                .param("resourceType", "team")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .claim("azp", "mobile-client")
                                    .claim("entitlement", entitlement))));

    // Then
    response.andExpect(status().isOk());
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("An unavailable current database remains a safe failure instead of empty choices")
  void rejectsUnavailableDatabase() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));
    when(options.read(SearchResourceTypeEnum.TEAM))
        .thenThrow(new DataAccessResourceFailureException("Controlled local failure"));

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.seasons").doesNotExist());
  }

  @Test
  @DisplayName("Explicit bypass rechecks the current grant instead of silently downgrading")
  void rechecksBypassGrant() throws Exception {
    // Given
    when(options.read(SearchResourceTypeEnum.TEAM))
        .thenReturn(
            new SearchOptions(
                SearchResourceTypeEnum.TEAM,
                List.of(),
                List.of(),
                List.of(SportFormatEnum.values()),
                List.of(SportGenderEnum.values())));
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT))
        .thenReturn(Set.of(Permission.BYPASS_MAINTENANCE), Set.of());

    // When
    ResultActions accepted =
        mvc.perform(
            get("/sporting-search-options")
                .param("resourceType", "team")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("subject")
                                    .claim("azp", "mobile-client"))));
    ResultActions revoked =
        mvc.perform(
            get("/sporting-search-options")
                .param("resourceType", "team")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("subject")
                                    .claim("azp", "mobile-client"))));
    ResultActions anonymous =
        mvc.perform(
            get("/sporting-search-options")
                .param("resourceType", "team")
                .header("Blockout-Maintenance-Bypass", "true"));

    // Then
    accepted.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    revoked.andExpect(status().isForbidden());
    anonymous.andExpect(status().isUnauthorized());
  }
}
