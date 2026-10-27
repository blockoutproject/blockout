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
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/** Real F05 identity, F12 admission and security with controlled SQL/transaction collaborators. */
@WebMvcTest(controllers = FollowingContractWebMvcTest.Adapter.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  FollowingRequest.class,
  CurrentAccount.class,
  MaintenanceAdmission.class,
  ActionAuthorization.class,
  CurrentPermissions.class,
  FollowingContractWebMvcTest.Adapter.class
})
@DisplayName("Following original owner admission")
class FollowAccessWebMvcTest {
  private static final UUID ORIGINAL = UUID.fromString(FollowingContractWebMvcTest.ACCOUNT);
  private static final UUID REPLACEMENT = UUID.fromString(FollowingContractWebMvcTest.TARGET);
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final String PATH = "/accounts/" + ORIGINAL + "/team-follows/" + REPLACEMENT;
  @Autowired MockMvc mvc;
  @MockitoBean AccountAccess accounts;
  @MockitoBean AccessSettingsStore settings;
  @MockitoBean PermissionStore permissions;
  @MockitoBean PlatformTransactionManager transactions;

  /** Supplies inactive maintenance and ordinary transaction execution without a database. */
  @BeforeEach
  void inactiveMaintenance() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
    when(transactions.getTransaction(ArgumentMatchers.any(TransactionDefinition.class)))
        .thenAnswer(invocation -> new SimpleTransactionStatus());
  }

  @ParameterizedTest
  @ValueSource(strings = {"free", "pro", "unknown"})
  @DisplayName("Admits the usable original UUID without entitlement conditions")
  void admitsOriginal(String entitlement) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ORIGINAL));

    // When
    ResultActions response =
        mvc.perform(
            get(PATH)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test")
                                    .claim("entitlement", entitlement))));

    // Then
    response.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(permissions);
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = "00000000-0000-4000-8000-000000000002")
  @DisplayName("Hides an absent or different original owner even with an administrator claim")
  void refusesUnavailableOriginal(UUID currentAccount) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.ofNullable(currentAccount));

    // When
    ResultActions response =
        mvc.perform(
            get(PATH)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test")
                                    .claim("roles", "administrator"))));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"));
  }

  @Test
  @DisplayName("Rejects guests before any private owner lookup")
  void rejectsPrivateGuest() throws Exception {
    // Given
    // No current account is required to establish the authentication refusal.

    // When
    ResultActions response = mvc.perform(get(PATH));

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Reports an unavailable private profile without exposing diagnostics")
  void reportsUnavailableProfile() throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject"))
        .thenThrow(new DataAccessResourceFailureException("Private fixture"));

    // When
    ResultActions response =
        mvc.perform(
            get(PATH)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test"))));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  @DisplayName("Refuses collector credentials at the mobile security boundary")
  void refusesCollector() throws Exception {
    // Given
    // No current account is required to establish the authentication refusal.

    // When
    ResultActions response =
        mvc.perform(get(PATH).with(jwt().jwt(token -> token.claim("azp", "collector-test"))));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Requires explicit current bypass before ordinary following access")
  void requiresBypass() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ORIGINAL));
    when(accounts.lock(ORIGINAL)).thenReturn(true);
    when(permissions.findByAccountId(ORIGINAL)).thenReturn(Set.of(Permission.BYPASS_MAINTENANCE));

    // When
    ResultActions response =
        mvc.perform(
            get(PATH)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test"))));

    ResultActions bypass =
        mvc.perform(
            get(PATH)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test"))));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    bypass.andExpect(status().isOk());
  }

  @Test
  @DisplayName("Bypass never authorizes another original lifecycle")
  void keepsBypassOwner() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(REPLACEMENT));
    when(accounts.lock(REPLACEMENT)).thenReturn(true);
    when(permissions.findByAccountId(REPLACEMENT))
        .thenReturn(Set.of(Permission.BYPASS_MAINTENANCE));

    // When
    ResultActions response =
        mvc.perform(
            get(PATH)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test"))));

    // Then
    response.andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Bypass requires a current grant rather than an administrator claim")
  void refusesMissingGrant() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ORIGINAL));
    when(accounts.lock(ORIGINAL)).thenReturn(true);
    when(permissions.findByAccountId(ORIGINAL)).thenReturn(Set.of());

    // When
    ResultActions response =
        mvc.perform(
            get(PATH)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test")
                                    .claim("roles", "administrator"))));

    // Then
    response.andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(strings = {"teams", "pools"})
  @DisplayName("Admits public follower counts without reading any private profile")
  void admitsPublicCounts(String resource) throws Exception {
    // Given
    String path = "/" + resource + "/" + REPLACEMENT + "/follower-count";

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response.andExpect(status().isOk());
    verifyNoInteractions(accounts, permissions);
  }
}
