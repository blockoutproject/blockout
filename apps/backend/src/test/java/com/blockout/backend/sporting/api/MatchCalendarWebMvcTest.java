package com.blockout.backend.sporting.api;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.ReadMatchCalendar;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
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

/** Actual generated MVC/security and JSON mappings with a controlled calendar application port. */
@WebMvcTest(ConsultationController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ConsultationApiMapperImpl.class,
  SportingExceptionHandler.class,
  ApiExceptionHandler.class
})
@DisplayName("Sporting calendar HTTP contract")
class MatchCalendarWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000214");
  @Autowired private MockMvc mvc;
  @MockitoBean private ReadSportingResources resources;
  @MockitoBean private ReadMatchCalendar calendars;
  @MockitoBean private MaintenanceAdmission admission;

  @Test
  @DisplayName("Serves a public exclusive calendar window with its evaluation time")
  void servesExactWindow() throws Exception {
    // Given
    OffsetDateTime evaluated = OffsetDateTime.parse("2026-09-20T12:00:00Z");
    ConsultationViews.Identity identity =
        new ConsultationViews.Identity(ID, "Synthetic", null, null);
    ConsultationViews.PoolSummary pool =
        new ConsultationViews.PoolSummary(
            identity,
            new SeasonView(ID, 2026, "2026/2027"),
            new ConsultationViews.Classification(null, null, null),
            null,
            null);
    ConsultationViews.MatchSummary match =
        new ConsultationViews.MatchSummary(
            ID,
            pool,
            identity,
            new ConsultationViews.Identity(
                UUID.fromString("00000000-0000-4000-8000-000000000215"), "Away", null, null),
            new ConsultationViews.Schedule(
                LocalDate.parse("2026-09-20"),
                OffsetDateTime.parse("2026-09-20T00:30:00+02:00"),
                "Europe/Paris",
                OffsetDateTime.parse("2026-09-01T12:00:00Z")),
            CalendarCategoryEnum.COMPLETED,
            null);
    when(calendars.read(any()))
        .thenReturn(
            new ConsultationViews.Calendar(
                CalendarCategoryEnum.COMPLETED,
                "America/New_York",
                evaluated,
                List.of(
                    new ConsultationViews.Day(
                        LocalDate.parse("2026-09-19"),
                        List.of(new ConsultationViews.PoolGroup(ID, List.of(match))))),
                LocalDate.parse("2026-09-19")));

    // When
    ResultActions response =
        mvc.perform(
            get("/matches")
                .param("teamId", ID.toString())
                .param("category", "completed")
                .param("timeZone", "America/New_York")
                .param("nextDay", "2026-09-20"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.evaluatedAt").value("2026-09-20T12:00:00Z"))
        .andExpect(jsonPath("$.days[0].date").value("2026-09-19"))
        .andExpect(jsonPath("$.nextDay").value("2026-09-19"))
        .andExpect(jsonPath("$.total").doesNotExist());
    verify(calendars)
        .read(
            new CalendarRequest(
                Kind.TEAM,
                ID,
                null,
                CalendarCategoryEnum.COMPLETED,
                ZoneId.of("America/New_York"),
                LocalDate.parse("2026-09-20")));
    verify(admission).requireOrdinaryAccess(null, null, false);
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "&teamId=", "&clubId=", "&seasonId="})
  @DisplayName("Rejects missing conflicting and incoherent selectors")
  void rejectsSelection(String extra) throws Exception {
    // Given
    String selector = extra.isEmpty() ? "" : "poolId=" + ID + extra + ID + "&";

    // When
    ResultActions response =
        mvc.perform(get("/matches?" + selector + "category=upcoming&timeZone=Europe/Paris"));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", containsString("no-store")));
    verifyNoInteractions(calendars);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "category=UPCOMING&timeZone=Europe/Paris",
        "category=other&timeZone=Europe/Paris",
        "category=upcoming&timeZone=Not/AZone",
        "category=upcoming&timeZone=+02:00",
        "category=upcoming&timeZone=Europe/Paris&nextDay=2026-02-30"
      })
  @DisplayName("Rejects invalid category IANA zone and day without leaking submitted values")
  void rejectsInvalidParameters(String params) throws Exception {
    // Given / When
    ResultActions response = mvc.perform(get("/matches?poolId=" + ID + "&" + params));

    // Then
    response.andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").doesNotExist());
    verifyNoInteractions(calendars);
  }

  @Test
  @DisplayName("Omits continuation for an exhausted successful empty calendar")
  void servesExhausted() throws Exception {
    // Given
    when(calendars.read(any()))
        .thenReturn(
            new ConsultationViews.Calendar(
                CalendarCategoryEnum.UPCOMING,
                "Europe/Paris",
                OffsetDateTime.parse("2026-09-20T12:00:00Z"),
                List.of(),
                null));

    // When / Then
    mvc.perform(
            get("/matches")
                .param("clubId", ID.toString())
                .param("seasonId", ID.toString())
                .param("category", "upcoming")
                .param("timeZone", "Europe/Paris"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.days").isEmpty())
        .andExpect(jsonPath("$.nextDay").doesNotExist());
  }

  @Test
  @DisplayName("Unknown or currently hidden selectors return the ordinary safe not-found")
  void refusesHidden() throws Exception {
    // Given
    when(calendars.read(any())).thenThrow(new SportingResourceNotFoundException());

    // When / Then
    mvc.perform(
            get("/matches")
                .param("poolId", ID.toString())
                .param("category", "upcoming")
                .param("timeZone", "Europe/Paris"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"));
  }
}
