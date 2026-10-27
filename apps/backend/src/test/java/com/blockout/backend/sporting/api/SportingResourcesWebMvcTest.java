package com.blockout.backend.sporting.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.ConsultationRequest.ClubSeasonRequest;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.ReadMatchCalendar;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;

/** Real generated MVC/security mapping with controlled application and current-admission ports. */
@WebMvcTest(ConsultationController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ConsultationApiMapperImpl.class,
  SportingExceptionHandler.class,
  ApiExceptionHandler.class
})
@DisplayName("Public sporting resource HTTP boundary")
class SportingResourcesWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000203");
  @Autowired private MockMvc mvc;
  @MockitoBean private ReadSportingResources resources;
  @MockitoBean private ReadMatchCalendar calendars;
  @MockitoBean private MaintenanceAdmission admission;

  @Test
  @DisplayName("Serves guest club facts without private state or credentials")
  void servesPublicClub() throws Exception {
    // Given
    when(resources.club(ID))
        .thenReturn(
            new ConsultationViews.ClubDetail(
                new ConsultationViews.Identity(ID, "Club", null, null),
                new ConsultationViews.Contacts(null, null, null, null, null, null),
                null,
                List.of()));

    // When
    ResultActions response = mvc.perform(get("/clubs/{id}", ID));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.club.name").value("Club"))
        .andExpect(jsonPath("$.seasons").isEmpty())
        .andExpect(jsonPath("$.revision").doesNotExist())
        .andExpect(jsonPath("$.following").doesNotExist());
    verify(admission).requireOrdinaryAccess(null, null, false);
  }

  @ParameterizedTest
  @CsvSource({"teams,$.team.team.id", "pools,$.pool.pool.id", "matches,$.match.id"})
  @DisplayName("Serves the exact team pool and match identity through generated JSON mappings")
  void servesResourceDetail(String path, String identityPath) throws Exception {
    // Given
    SeasonView season = new SeasonView(ID, 2026, "2026/2027");
    ConsultationViews.Identity identity =
        new ConsultationViews.Identity(ID, "Resource", null, null);
    ConsultationViews.Classification classification =
        new ConsultationViews.Classification(null, null, null);
    ConsultationViews.PoolSummary pool =
        new ConsultationViews.PoolSummary(identity, season, classification, null, null);
    switch (path) {
      case "teams" -> {
        when(resources.team(ID))
            .thenReturn(
                new ConsultationViews.TeamDetail(
                    new ConsultationViews.TeamSummary(identity, season, classification, null, true),
                    List.of(pool)));
      }
      case "pools" -> {
        when(resources.pool(ID)).thenReturn(new ConsultationViews.PoolDetail(pool));
      }
      case "matches" -> {
        when(resources.match(ID))
            .thenReturn(
                new ConsultationViews.MatchDetail(
                    new ConsultationViews.MatchSummary(
                        ID,
                        pool,
                        identity,
                        identity,
                        new ConsultationViews.Schedule(
                            LocalDate.of(2026, 10, 24),
                            null,
                            null,
                            OffsetDateTime.parse("2026-10-24T12:00:00Z")),
                        CalendarCategoryEnum.UPCOMING,
                        null),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of()));
      }
      default -> throw new IllegalArgumentException(path);
    }

    // When
    ResultActions response = mvc.perform(get("/" + path + "/{id}", ID));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath(identityPath).value(ID.toString()))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Returns a successful empty exact club-season selection")
  void servesEmptySeason() throws Exception {
    // Given
    when(resources.clubTeams(new ClubSeasonRequest(ID, ID)))
        .thenReturn(new ConsultationViews.ClubTeams(ID, List.of()));

    // When
    ResultActions response =
        mvc.perform(get("/clubs/{id}/teams", ID).param("seasonId", ID.toString()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seasonId").value(ID.toString()))
        .andExpect(jsonPath("$.items").isEmpty());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/clubs/", "/teams/", "/pools/", "/matches/", "/clubs/logo/"})
  @DisplayName("Returns safe not-found for missing hidden or dateless targets")
  void refusesUnavailableTarget(String path) throws Exception {
    // Given
    switch (path) {
      case "/clubs/" ->
          when(resources.club(any())).thenThrow(new SportingResourceNotFoundException());
      case "/teams/" ->
          when(resources.team(any())).thenThrow(new SportingResourceNotFoundException());
      case "/pools/" ->
          when(resources.pool(any())).thenThrow(new SportingResourceNotFoundException());
      case "/matches/" ->
          when(resources.match(any())).thenThrow(new SportingResourceNotFoundException());
      case "/clubs/logo/" ->
          when(resources.clubLogo(any())).thenThrow(new SportingResourceNotFoundException());
      default -> throw new IllegalArgumentException(path);
    }
    String target = path.equals("/clubs/logo/") ? "/clubs/" + ID + "/logo" : path + ID;

    // When
    ResultActions response = mvc.perform(get(target));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(content().contentType("application/problem+json"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Requires an explicit club season before reading data")
  void requiresSeason() throws Exception {
    // Given
    String path = "/clubs/{id}/teams";

    // When
    ResultActions response = mvc.perform(get(path, ID));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(resources);
  }

  @Test
  @DisplayName("Reports an unknown club season safely")
  void refusesUnknownSeason() throws Exception {
    // Given
    when(resources.clubTeams(any())).thenThrow(new SportingResourceNotFoundException());

    // When
    ResultActions response =
        mvc.perform(get("/clubs/{id}/teams", ID).param("seasonId", ID.toString()));

    // Then
    response.andExpect(status().isNotFound());
  }

  @ParameterizedTest
  @CsvSource({"clubs,image/png", "teams,image/jpeg", "divisions,image/png"})
  @DisplayName("Delivers the effective binary image with its owner media type")
  void servesBinaryLogo(String kind, String media) throws Exception {
    // Given
    byte[] bytes = new byte[] {1, 2, 3};
    Image image = new Image(bytes, media);
    switch (kind) {
      case "clubs" -> when(resources.clubLogo(ID)).thenReturn(image);
      case "teams" ->
          when(resources.teamLogo(ID, TeamLogoSelectionEnum.EFFECTIVE)).thenReturn(image);
      case "divisions" -> when(resources.divisionLogo(ID)).thenReturn(image);
      default -> throw new IllegalArgumentException(kind);
    }

    // When
    ResultActions response = mvc.perform(get("/" + kind + "/{id}/logo", ID));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(content().contentType(media))
        .andExpect(content().bytes(bytes))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Binds automatic logo selection without silently choosing the manual logo")
  void bindsAutomaticLogo() throws Exception {
    // Given
    when(resources.teamLogo(ID, TeamLogoSelectionEnum.AUTOMATIC))
        .thenReturn(new Image(new byte[] {1}, "image/png"));

    // When
    ResultActions response =
        mvc.perform(get("/teams/{id}/logo", ID).param("selection", "automatic"));

    // Then
    response.andExpect(status().isOk());
    verify(resources).teamLogo(ID, TeamLogoSelectionEnum.AUTOMATIC);
  }

  @ParameterizedTest
  @ValueSource(strings = {"EFFECTIVE", "AUTOMATIC", " automatic ", "unknown", " "})
  @DisplayName("Rejects noncanonical logo selections before reading image content")
  void rejectsNoncanonicalLogoSelection(String selection) throws Exception {
    // Given
    UUID team = ID;

    // When
    ResultActions response =
        mvc.perform(get("/teams/{id}/logo", team).param("selection", selection));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(jsonPath("$.instance").doesNotExist());
    verifyNoInteractions(resources, calendars);
  }

  @Test
  @DisplayName("Preserves the generated effective-logo default for an empty selection")
  void preservesEmptyLogoDefault() throws Exception {
    // Given
    when(resources.teamLogo(ID, TeamLogoSelectionEnum.EFFECTIVE))
        .thenReturn(new Image(new byte[] {1}, "image/png"));

    // When
    ResultActions response = mvc.perform(get("/teams/{id}/logo", ID).param("selection", ""));

    // Then
    response.andExpect(status().isOk());
    verify(resources).teamLogo(ID, TeamLogoSelectionEnum.EFFECTIVE);
  }

  @Test
  @DisplayName("Rechecks current authorized bypass before image delivery")
  void admitsExplicitBypass() throws Exception {
    // Given
    when(resources.clubLogo(ID)).thenReturn(new Image(new byte[] {1}, "image/png"));

    // When
    ResultActions response =
        mvc.perform(
            get("/clubs/{id}/logo", ID)
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
    verify(admission).requireOrdinaryAccess("https://identity.example.invalid/", "operator", true);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/clubs/{id}",
        "/teams/{id}",
        "/pools/{id}",
        "/matches/{id}",
        "/clubs/{id}/logo",
        "/teams/{id}/logo",
        "/divisions/{id}/logo"
      })
  @DisplayName("Refuses guest bypass before any sporting read")
  void refusesGuestBypass(String path) throws Exception {
    // Given
    doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED))
        .when(admission)
        .requireOrdinaryAccess(isNull(), isNull(), eq(true));

    // When
    ResultActions response =
        mvc.perform(get(path, ID).header("Blockout-Maintenance-Bypass", "true"));

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(resources);
  }

  @Test
  @DisplayName("Refuses an invalid bearer without falling back to public admission")
  void refusesInvalidBearer() throws Exception {
    // Given
    String bearer = "Bearer invalid";

    // When
    ResultActions response = mvc.perform(get("/clubs/{id}", ID).header("Authorization", bearer));

    // Then
    response.andExpect(status().isUnauthorized());
    verifyNoInteractions(resources);
  }
}
