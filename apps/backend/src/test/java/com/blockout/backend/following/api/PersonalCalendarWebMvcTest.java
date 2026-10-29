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
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarWindow;
import com.blockout.backend.sporting.application.ConsultationViews;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
 * Production calendar route and original-owner/admission binding; application reads are controlled.
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
@DisplayName("Personal calendar HTTP boundary")
class PersonalCalendarWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString(FollowingContractWebMvcTest.ACCOUNT);
  private static final UUID SEASON = UUID.fromString(FollowingContractWebMvcTest.TARGET);
  @Autowired private MockMvc mvc;
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
  @DisplayName(
      "Binds a season and exclusive day and maps the shared calendar envelope with no-store")
  void returnsCalendar() throws Exception {
    // Given
    owner();
    CalendarWindow window =
        new CalendarWindow(
            CalendarCategoryEnum.COMPLETED,
            ZoneId.of("America/New_York"),
            LocalDate.parse("2026-10-20"));
    when(calendars.read(ACCOUNT, SEASON, window))
        .thenReturn(
            new ReadPersonalCalendar.Calendar(
                true,
                new ConsultationViews.Calendar(
                    window.category(),
                    window.timeZone().getId(),
                    OffsetDateTime.parse("2026-10-28T12:00:00Z"),
                    List.of(),
                    LocalDate.parse("2026-10-10"))));

    // When
    ResultActions response =
        mvc.perform(
            get(path()
                    + "?category=completed&timeZone=America/New_York&seasonId="
                    + SEASON
                    + "&nextDay=2026-10-20")
                .with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.hasAvailableFollows").value(true))
        .andExpect(jsonPath("$.calendar.category").value("completed"))
        .andExpect(jsonPath("$.calendar.timeZone").value("America/New_York"))
        .andExpect(jsonPath("$.calendar.evaluatedAt").value("2026-10-28T12:00:00Z"))
        .andExpect(jsonPath("$.calendar.nextDay").value("2026-10-10"))
        .andExpect(jsonPath("$.calendar.days").isEmpty())
        .andExpect(jsonPath("$.origins").doesNotExist());
  }

  @Test
  @DisplayName(
      "Omitted season reads all seasons and preserves false without inventing a public fallback")
  void allSeasons() throws Exception {
    // Given
    owner();
    when(calendars.read(
            ACCOUNT,
            null,
            new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneId.of("Europe/Paris"), null)))
        .thenReturn(
            new ReadPersonalCalendar.Calendar(
                false,
                new ConsultationViews.Calendar(
                    CalendarCategoryEnum.UPCOMING,
                    "Europe/Paris",
                    OffsetDateTime.parse("2026-10-28T12:00:00Z"),
                    List.of(),
                    null)));

    // When
    ResultActions response =
        mvc.perform(get(path() + "?category=upcoming&timeZone=Europe/Paris").with(mobile()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hasAvailableFollows").value(false))
        .andExpect(jsonPath("$.calendar.days").isEmpty())
        .andExpect(jsonPath("$.calendar.nextDay").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "category=UPCOMING&timeZone=Europe/Paris",
        "category=upcoming&timeZone=+02:00",
        "category=upcoming&timeZone=Missing/Zone",
        "category=upcoming",
        "timeZone=Europe/Paris",
        "category=upcoming&timeZone=Europe/Paris&q=x",
        "category=upcoming&timeZone=Europe/Paris&nextDay=not-a-date",
        "category=upcoming&timeZone=Europe/Paris&seasonId=",
        "category=upcoming&category=completed&timeZone=Europe/Paris"
      })
  @DisplayName("Rejects undeclared repeated or malformed calendar inputs")
  void rejectsQuery(String query) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path() + "?" + query).with(mobile());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(calendars);
  }

  @Test
  @DisplayName("Hides an unavailable selected season without falling back")
  void unavailableSeason() throws Exception {
    // Given
    owner();
    when(calendars.read(
            ACCOUNT,
            SEASON,
            new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneId.of("Europe/Paris"), null)))
        .thenThrow(new FollowUnavailableTargetException());

    // When
    ResultActions response =
        mvc.perform(
            get(path() + "?category=upcoming&timeZone=Europe/Paris&seasonId=" + SEASON)
                .with(mobile()));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Hides another original account even from an administrator")
  void hidesOtherOwner() throws Exception {
    // Given
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(UUID.fromString("00000000-0000-4000-8000-000000000231")));

    // When
    ResultActions response =
        mvc.perform(get(path() + "?category=upcoming&timeZone=Europe/Paris").with(mobile()));

    // Then
    response.andExpect(status().isNotFound());
    verifyNoInteractions(calendars);
  }

  @Test
  @DisplayName("Rejects a guest without reading a private calendar")
  void rejectsGuest() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get(path() + "?category=upcoming&timeZone=Europe/Paris");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(calendars);
  }

  @Test
  @DisplayName("Keeps storage failure distinct from a successful empty calendar")
  void unavailableStorage() throws Exception {
    // Given
    owner();
    when(calendars.read(
            ACCOUNT,
            null,
            new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneId.of("Europe/Paris"), null)))
        .thenThrow(new DataAccessResourceFailureException("private diagnostic"));

    // When
    ResultActions response =
        mvc.perform(get(path() + "?category=upcoming&timeZone=Europe/Paris").with(mobile()));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(jsonPath("$.hasAvailableFollows").doesNotExist());
  }

  @Test
  @DisplayName("Maintenance refuses ordinary calendar access before personal reads")
  void maintenance() throws Exception {
    // Given
    when(settings.maintenance()).thenReturn(new MaintenanceSettings(2, true, "Prepared", null));

    // When
    ResultActions response =
        mvc.perform(get(path() + "?category=upcoming&timeZone=Europe/Paris").with(mobile()));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    verifyNoInteractions(calendars);
  }

  /** Captures a usable original account without controlling calendar behavior. */
  private void owner() {
    when(accounts.currentId("https://identity.example.invalid/", "subject"))
        .thenReturn(Optional.of(ACCOUNT));
  }

  /** Supplies a validated mobile principal; role grants no foreign-account authority. */
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

  /** Returns the canonical original-account matches collection. */
  private String path() {
    return "/accounts/" + ACCOUNT + "/matches";
  }
}
