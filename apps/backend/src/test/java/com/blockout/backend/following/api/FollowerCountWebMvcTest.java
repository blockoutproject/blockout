package com.blockout.backend.following.api;

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
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadFollowerCount;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/** Public generated count routes and actual F12 admission; count persistence is controlled. */
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
@DisplayName("Public follower count HTTP boundary")
class FollowerCountWebMvcTest {
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

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Reads a public count without resolving a private account or grants")
  void publicCount(String kind) throws Exception {
    // Given
    when(counts.read(target(kind))).thenReturn(9007199254740991L);

    // When
    ResultActions response = mvc.perform(get(path(kind)));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.count").value(9007199254740991L))
        .andExpect(jsonPath("$.accounts").doesNotExist())
        .andExpect(jsonPath("$.followers").doesNotExist());
    verifyNoInteractions(accounts, permissions, state, options, lists, calendars);
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Returns a genuine empty count as zero")
  void zeroCount(String kind) throws Exception {
    // Given
    when(counts.read(target(kind))).thenReturn(0L);

    // When
    ResultActions response = mvc.perform(get(path(kind)));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "seasonId=00000000-0000-4000-8000-000000000001",
        "page=0",
        "accountId=other",
        "bypass=true"
      })
  @DisplayName("Rejects personal filters and undeclared query properties")
  void rejectsQuery(String query) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path("team") + "?" + query);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(counts, accounts);
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Hides unavailable targets without an invented zero")
  void unavailableTarget(String kind) throws Exception {
    // Given
    when(counts.read(target(kind))).thenThrow(new FollowUnavailableTargetException());

    // When
    ResultActions response = mvc.perform(get(path(kind)));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.count").doesNotExist())
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  @DisplayName("Returns unavailable on storage failure without an invented zero")
  void failedRead() throws Exception {
    // Given
    when(counts.read(target("pool")))
        .thenThrow(new DataAccessResourceFailureException("private diagnostic"));

    // When
    ResultActions response = mvc.perform(get(path("pool")));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.count").doesNotExist())
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  @DisplayName("Requires authenticated current grants for an explicit maintenance bypass")
  void explicitBypass() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT)).thenReturn(Set.of(Permission.BYPASS_MAINTENANCE));
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenReturn(new SimpleTransactionStatus());
    when(counts.read(target("pool"))).thenReturn(7L);

    // When
    ResultActions blocked = mvc.perform(get(path("pool")));

    // Then
    blocked.andExpect(status().isServiceUnavailable());
    verifyNoInteractions(counts, accounts);

    // When
    ResultActions allowed =
        mvc.perform(get(path("pool")).with(mobile()).header("Blockout-Maintenance-Bypass", "true"));

    // Then
    allowed.andExpect(status().isOk()).andExpect(jsonPath("$.count").value(7));
  }

  @Test
  @DisplayName("Rejects a bypass without a current grant")
  void rejectsUnprivilegedBypass() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT)).thenReturn(Set.of());
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenReturn(new SimpleTransactionStatus());

    // When
    ResultActions response =
        mvc.perform(get(path("team")).with(mobile()).header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(counts);
  }

  /** Exact typed sporting identity; no account belongs to the public count input. */
  private Target target(String kind) {
    return new Target(kind.equals("team") ? TargetType.TEAM : TargetType.POOL, SEASON);
  }

  /** Supplies the existing mobile JWT boundary for deliberate maintenance bypass only. */
  private RequestPostProcessor mobile() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("subject")
                    .claim("azp", "mobile-test"));
  }

  /** Returns the canonical generated public count route. */
  private String path(String kind) {
    return "/" + kind + "s/" + SEASON + "/follower-count";
  }
}
