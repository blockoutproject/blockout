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
import com.blockout.backend.following.application.FollowPageOutOfRangeException;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadFollowerCount;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/** Real list binding, security and summary mapping with controlled application reads. */
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
@DisplayName("Personal team and pool list HTTP boundary")
class FollowListsWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000229");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000002026");
  private static final UUID TARGET = UUID.fromString("00000000-0000-4000-8000-000000000021");
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

  /** Provides ordinary F12 admission without implying current-account success. */
  @BeforeEach
  void admission() {
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(1, false, "Prepared", null));
  }

  @Test
  @DisplayName("Returns current F03 team context and a continuation without a total")
  void returnsTeams() throws Exception {
    // Given
    owner();
    when(lists.teams(ACCOUNT, SEASON, 1))
        .thenReturn(
            new ReadFollowLists.Teams(
                List.of(
                    new ConsultationViews.TeamSummary(
                        identity(),
                        new SeasonView(SEASON, 2026, "2026/2027"),
                        classification(),
                        null,
                        true)),
                2L));

    // When
    ResultActions response =
        mvc.perform(get(path("team") + "?seasonId=" + SEASON + "&page=1").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items[0].team.id").value(TARGET.toString()))
        .andExpect(jsonPath("$.items[0].team.name").value("Équipe actuelle"))
        .andExpect(jsonPath("$.items[0].season.id").value(SEASON.toString()))
        .andExpect(jsonPath("$.items[0].classification.format").value("6x6"))
        .andExpect(jsonPath("$.items[0].professional").value(true))
        .andExpect(jsonPath("$.nextPage").value(2))
        .andExpect(jsonPath("$.total").doesNotExist());
  }

  @Test
  @DisplayName("Returns current F03 pool context with omitted exhausted continuation")
  void returnsPools() throws Exception {
    // Given
    owner();
    when(lists.pools(ACCOUNT, null, 0))
        .thenReturn(
            new ReadFollowLists.Pools(
                List.of(
                    new ConsultationViews.PoolSummary(
                        identity(),
                        new SeasonView(SEASON, 2026, "2026/2027"),
                        classification(),
                        "Championnat",
                        "Phase 2")),
                null));

    // When
    ResultActions response = mvc.perform(get(path("pool")).with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items[0].pool.id").value(TARGET.toString()))
        .andExpect(jsonPath("$.items[0].competitionName").value("Championnat"))
        .andExpect(jsonPath("$.items[0].phaseName").value("Phase 2"))
        .andExpect(jsonPath("$.nextPage").doesNotExist())
        .andExpect(jsonPath("$.total").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(strings = {"page=-1", "page=107374183", "page=9223372036854775808"})
  @DisplayName("Rejects malformed or out-of-range pages before a list read")
  void rejectsQuery(String query) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path("team") + "?" + query).with(mobile());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(lists);
  }

  @Test
  @DisplayName("Accepts the greatest representable page without rounding")
  void acceptsMaximumPage() throws Exception {
    // Given
    owner();
    when(lists.teams(ACCOUNT, null, 107374182L))
        .thenReturn(new ReadFollowLists.Teams(List.of(), null));

    // When
    ResultActions response = mvc.perform(get(path("team") + "?page=107374182").with(mobile()));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  @DisplayName("Returns BadRequest when the next page cannot be represented")
  void rejectsOverflowContinuation() throws Exception {
    // Given
    owner();
    when(lists.teams(ACCOUNT, null, 107374182L)).thenThrow(new FollowPageOutOfRangeException());

    // When
    ResultActions response = mvc.perform(get(path("team") + "?page=107374182").with(mobile()));

    // Then
    response.andExpect(status().isBadRequest()).andExpect(jsonPath("$.items").doesNotExist());
  }

  @Test
  @DisplayName("Hides an unavailable selected season without returning an empty success")
  void hidesUnavailableSeason() throws Exception {
    // Given
    owner();
    when(lists.pools(ACCOUNT, SEASON, 0)).thenThrow(new FollowUnavailableTargetException());

    // When
    ResultActions response = mvc.perform(get(path("pool") + "?seasonId=" + SEASON).with(mobile()));

    // Then
    response.andExpect(status().isNotFound()).andExpect(jsonPath("$.items").doesNotExist());
  }

  @Test
  @DisplayName("Keeps storage failure distinct from successful empty lists")
  void reportsUnavailable() throws Exception {
    // Given
    owner();
    when(lists.teams(ACCOUNT, null, 0))
        .thenThrow(new DataAccessResourceFailureException("private diagnostic"));

    // When
    ResultActions response = mvc.perform(get(path("team")).with(mobile()));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items").doesNotExist())
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  @DisplayName("Rejects guests before reading private follows")
  void rejectsGuest() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path("pool"));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(lists);
  }

  @Test
  @DisplayName("Maintenance requires an explicit currently authorized bypass for private lists")
  void requiresExplicitBypass() throws Exception {
    // Given
    owner();
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Pause", null));
    when(accounts.lock(ACCOUNT)).thenReturn(true);
    when(permissions.findByAccountId(ACCOUNT)).thenReturn(Set.of(Permission.BYPASS_MAINTENANCE));
    when(transactions.getTransaction(any(TransactionDefinition.class)))
        .thenReturn(new SimpleTransactionStatus());
    when(lists.pools(ACCOUNT, null, 0)).thenReturn(new ReadFollowLists.Pools(List.of(), null));

    // When
    ResultActions refused = mvc.perform(get(path("pool")).with(mobile()));

    // Then
    refused.andExpect(status().isServiceUnavailable());
    verifyNoInteractions(lists);

    // When
    ResultActions admitted =
        mvc.perform(get(path("pool")).with(mobile()).header("Blockout-Maintenance-Bypass", "true"));

    // Then
    admitted.andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  @DisplayName("Hides a different original account even for an administrator")
  void hidesOtherOwner() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(SEASON));

    // When
    ResultActions response = mvc.perform(get(path("team")).with(mobile()));

    // Then
    response.andExpect(status().isNotFound());
    verifyNoInteractions(lists);
  }

  @Test
  @DisplayName("Rejects an ingestion audience before private account lookup")
  void rejectsWrongClient() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get(path("team"))
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
    verifyNoInteractions(lists, accounts);
  }

  /** Maps the admitted principal to this exact original synthetic account. */
  private void owner() {
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
  }

  /** Supplies the validated mobile audience with no foreign-account privileges. */
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

  /**
   * Returns the scenario's declared team or pool collection.
   *
   * @param type exact team or pool wire resource kind
   * @return the original account's canonical collection path
   */
  private String path(String type) {
    return "/accounts/" + ACCOUNT + "/" + type + "-follows";
  }

  /** Supplies public identity values with an intentionally accented current name. */
  private ConsultationViews.Identity identity() {
    return new ConsultationViews.Identity(TARGET, "Équipe actuelle", null, null);
  }

  /** Supplies current F03 classification without inventing a division presentation. */
  private ConsultationViews.Classification classification() {
    return new ConsultationViews.Classification(null, SportFormatEnum._6X6, SportGenderEnum.MIXED);
  }
}
