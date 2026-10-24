package com.blockout.backend.following.application;

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
import com.blockout.backend.following.api.FollowingContractTest;
import com.blockout.backend.following.api.FollowingRequest;
import com.blockout.backend.following.api.FollowingWebConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/** Real F05 identity, F12 admission and security with controlled SQL/transaction collaborators. */
@WebMvcTest(controllers = FollowingContractTest.Adapter.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  FollowingRequest.class,
  FollowingWebConfiguration.class,
  CurrentAccount.class,
  MaintenanceAdmission.class,
  ActionAuthorization.class,
  CurrentPermissions.class,
  FollowingContractTest.Adapter.class
})
@DisplayName("Following original owner admission")
class FollowAccessTest {
  private static final UUID ORIGINAL = UUID.fromString(FollowingContractTest.ACCOUNT);
  private static final UUID REPLACEMENT = UUID.fromString(FollowingContractTest.TARGET);
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
        .thenReturn(new SimpleTransactionStatus());
  }

  @ParameterizedTest
  @ValueSource(strings = {"free", "pro", "unknown"})
  @DisplayName("Admits the usable original UUID without entitlement conditions")
  void admitsOriginal(String entitlement) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject")).thenReturn(Optional.of(ORIGINAL));

    // When
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
                                    .claim("entitlement", entitlement))))
        // Then
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(permissions);
  }

  @ParameterizedTest
  @ValueSource(strings = {"other", "erased", "recreated"})
  @DisplayName(
      "Hides other, erased and replaced original lifecycles even with an administrator claim")
  void refusesUnavailableOriginal(String lifecycle) throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject"))
        .thenReturn(lifecycle.equals("erased") ? Optional.empty() : Optional.of(REPLACEMENT));

    // When
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
                                    .claim("roles", "administrator"))))
        // Then
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"));
  }

  @Test
  @DisplayName("Rejects guests before private lookup while public counts stay independent")
  void separatesGuestAccess() throws Exception {
    // Given / When
    mvc.perform(get(PATH))
        // Then
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/teams/" + REPLACEMENT + "/follower-count")).andExpect(status().isOk());
    verifyNoInteractions(accounts, permissions);
  }

  @Test
  @DisplayName("Keeps profile unavailability separate from public viewing")
  void preservesPublicOnProfileFailure() throws Exception {
    // Given
    when(accounts.currentId(ISSUER, "subject"))
        .thenThrow(new DataAccessResourceFailureException("Private fixture"));

    // When
    mvc.perform(
            get(PATH)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.detail").doesNotExist());
    mvc.perform(get("/pools/" + REPLACEMENT + "/follower-count")).andExpect(status().isOk());
  }

  @Test
  @DisplayName("Refuses collector credentials at the mobile security boundary")
  void refusesCollector() throws Exception {
    // Given / When
    mvc.perform(get(PATH).with(jwt().jwt(token -> token.claim("azp", "collector-test"))))
        // Then
        .andExpect(status().isForbidden());
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
    mvc.perform(
            get(PATH)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject("subject")
                                    .claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
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
                                    .claim("azp", "mobile-test"))))
        .andExpect(status().isOk());
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
                                    .claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isNotFound());
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
                                    .claim("roles", "administrator"))))
        // Then
        .andExpect(status().isForbidden());
  }
}
