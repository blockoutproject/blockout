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
import com.blockout.backend.search.application.ReadSearch;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
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
@DisplayName("Discovery shared access boundaries")
class DiscoveryAccessWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private PermissionStore permissions;
  @MockitoBean private AccessSettingsStore settings;
  @MockitoBean private PlatformTransactionManager transactions;
  @MockitoBean private ReadSearch reads;

  /** Runs the real admission callback without claiming database transaction semantics. */
  @BeforeEach
  void supplyTransactionBoundary() {
    when(transactions.getTransaction(any()))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/clubs", "/teams", "/pools"})
  @DisplayName("Admits public textual discovery without an account lookup")
  void admitsGuest(String path) throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response = mvc.perform(get(path).param("q", "eagles"));

    // Then
    response.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(accounts, permissions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"free", "pro", "unknown"})
  @DisplayName("Ignores entitlement claims for ordinary public search")
  void admitsPublicRights(String entitlement) throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Available", null));
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs")
                .param("q", "eagles")
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
  @DisplayName("Refuses anonymous explicit bypass during active maintenance")
  void refusesMissingBypassIdentity() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs").param("q", "eagles").header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads, accounts, permissions);
  }

  @Test
  @DisplayName("Refuses a malformed bearer before current admission or search")
  void refusesInvalidBearer() throws Exception {
    // Given
    String malformedBearer = "Bearer malformed";

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs")
                .param("q", "eagles")
                .header("Blockout-Maintenance-Bypass", "true")
                .header("Authorization", malformedBearer));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unauthenticated"));
    verifyNoInteractions(settings, reads, accounts, permissions);
  }

  @Test
  @DisplayName("Refuses an authenticated wrong mobile client before current admission or search")
  void refusesWrongClient() throws Exception {
    // Given
    String client = "different-client";

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs")
                .param("q", "eagles")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(jwt().jwt(token -> token.claim("azp", client))));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(settings, reads, accounts, permissions);
  }

  @Test
  @DisplayName("Refuses ordinary search during active maintenance before reading sporting data")
  void refusesActiveMaintenance() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", "eagles"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    verifyNoInteractions(reads, accounts, permissions);
  }

  @Test
  @DisplayName("Rechecks the actual current bypass grant on every search request")
  void rechecksCurrentGrant() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT))
        .thenReturn(Set.of(Permission.BYPASS_MAINTENANCE), Set.of());
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions admitted =
        mvc.perform(
            get("/clubs")
                .param("q", "eagles")
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
            get("/clubs")
                .param("q", "eagles")
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("subject")
                                    .claim("azp", "mobile-client"))));

    // Then
    admitted.andExpect(status().isOk());
    revoked
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
  }
}
