package com.blockout.backend.sporting.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.StandingsAvailabilityEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.ReadMatchCalendar;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;

/**
 * Generated MVC, security and real MapStruct mapping; application reads/admission are controlled.
 */
@WebMvcTest(ConsultationController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ConsultationApiMapperImpl.class,
  SportingExceptionHandler.class,
  ApiExceptionHandler.class
})
@DisplayName("Independent pool HTTP reads")
class PoolConsultationWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000209");
  @Autowired private MockMvc mvc;
  @MockitoBean private ReadSportingResources resources;
  @MockitoBean private ReadMatchCalendar calendars;
  @MockitoBean private MaintenanceAdmission admission;

  @Test
  @DisplayName("Serializes retained official values without inventing missing rank or statistics")
  void servesOfficialTable() throws Exception {
    // Given
    when(resources.standings(ID))
        .thenReturn(
            new ConsultationViews.Standings(
                ID,
                StandingsAvailabilityEnum.AVAILABLE,
                OffsetDateTime.parse("2026-10-20T12:00:00Z"),
                true,
                List.of("Ratio", "Pts"),
                List.of(
                    new ConsultationViews.StandingRow(
                        "Unmatched", null, null, Map.of("Ratio", "∞")))));

    // When
    ResultActions response = mvc.perform(get("/pools/{id}/standings", ID));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.observedAt").value("2026-10-20T12:00:00Z"))
        .andExpect(jsonPath("$.lastAttemptFailed").value(true))
        .andExpect(jsonPath("$.columns[0]").value("Ratio"))
        .andExpect(jsonPath("$.rows[0].sourceName").value("Unmatched"))
        .andExpect(jsonPath("$.rows[0].position").doesNotExist())
        .andExpect(jsonPath("$.rows[0].team").doesNotExist())
        .andExpect(jsonPath("$.rows[0].statistics.Ratio").value("∞"))
        .andExpect(jsonPath("$.rows[0].statistics.Pts").doesNotExist());
    verify(admission).requireOrdinaryAccess(null, null, false);
    verifyNoInteractions(calendars);
  }

  @Test
  @DisplayName("A successful empty participant collection is independent of standings")
  void servesEmptyParticipants() throws Exception {
    // Given
    when(resources.participants(ID)).thenReturn(new ConsultationViews.Participants(ID, List.of()));

    // When
    ResultActions response = mvc.perform(get("/pools/{id}/participants", ID));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.poolId").value(ID.toString()))
        .andExpect(jsonPath("$.items").isEmpty());
    verify(resources).participants(ID);
    verifyNoInteractions(calendars);
  }

  @ParameterizedTest
  @ValueSource(strings = {"standings", "participants"})
  @DisplayName("Hidden and unknown pools return safe NotFound")
  void refusesUnavailablePool(String section) throws Exception {
    // Given
    if (section.equals("standings"))
      when(resources.standings(ID)).thenThrow(new SportingResourceNotFoundException());
    else when(resources.participants(ID)).thenThrow(new SportingResourceNotFoundException());

    // When
    ResultActions response = mvc.perform(get("/pools/{id}/{section}", ID, section));

    // Then
    response.andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(strings = {"standings", "participants"})
  @DisplayName("Explicit bypass retains the actual authenticated admission")
  void admitsExplicitBypass(String section) throws Exception {
    // Given
    when(resources.standings(ID))
        .thenReturn(
            new ConsultationViews.Standings(
                ID, StandingsAvailabilityEnum.UNAVAILABLE, null, false, List.of(), List.of()));
    when(resources.participants(ID)).thenReturn(new ConsultationViews.Participants(ID, List.of()));

    // When
    ResultActions response =
        mvc.perform(
            get("/pools/{id}/{section}", ID, section)
                .header("Blockout-Maintenance-Bypass", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject("operator")
                                    .claim("azp", "mobile-test"))));

    // Then
    response.andExpect(status().isOk());
    verify(admission).requireOrdinaryAccess(any(), any(), org.mockito.ArgumentMatchers.eq(true));
  }

  @ParameterizedTest
  @ValueSource(strings = {"standings", "participants"})
  @DisplayName("Refused bypass never reaches a public fallback read")
  void refusesInvalidBypass(String section) throws Exception {
    // Given
    doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED))
        .when(admission)
        .requireOrdinaryAccess(any(), any(), org.mockito.ArgumentMatchers.eq(true));

    // When
    ResultActions response =
        mvc.perform(
            get("/pools/{id}/{section}", ID, section)
                .header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(resources);
  }
}
