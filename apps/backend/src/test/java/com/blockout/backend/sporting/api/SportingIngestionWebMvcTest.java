package com.blockout.backend.sporting.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.api.CollectionExceptionHandler;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.shared.http.IngestionBodyLimitAdvice;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.StandingsObservation;
import com.blockout.backend.sporting.application.service.CalendarAcceptanceService;
import com.blockout.backend.sporting.application.service.CatalogAcceptanceService;
import com.blockout.backend.sporting.application.service.ClubDetailsService;
import com.blockout.backend.sporting.application.service.ClubLocalityService;
import com.blockout.backend.sporting.application.service.MatchAcceptanceService;
import com.blockout.backend.sporting.application.service.SportingImageService;
import com.blockout.backend.sporting.application.service.StandingsService;
import com.blockout.backend.sporting.support.SportingImageFixture;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Actual generated request binding; acceptance collaborators are isolated in the MVC slice. */
@WebMvcTest(SportingIngestionController.class)
@AutoConfigureMockMvc
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ApiExceptionHandler.class,
  CollectionExceptionHandler.class,
  SportingExceptionHandler.class,
  SportingObservationMapperImpl.class,
  SportingPresentationMapperImpl.class,
  SportingObservationValidator.class,
  IngestionBodyLimitAdvice.class
})
@DisplayName("Sporting ingestion request limits")
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
class SportingIngestionWebMvcTest {
  @Autowired private MockMvc mvc;
  @MockitoBean private MatchAcceptanceService matches;
  @MockitoBean private CalendarAcceptanceService calendars;
  @MockitoBean private CatalogAcceptanceService catalogs;
  @MockitoBean private StandingsService standings;
  @MockitoBean private ClubDetailsService clubs;

  @MockitoBean private ClubLocalityService localities;

  @MockitoBean private SportingImageService images;

  @Test
  @DisplayName("Refuses a calendar whose combined collections exceed 1000 entries")
  void refusesCombinedOverflow() throws Exception {
    // Given
    String slot = "{\"sourceReference\":\"bye\",\"kind\":\"bye\"}";
    String slots = String.join(",", Collections.nCopies(1000, slot));
    String body =
        """
        {"context":{"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":1,
        "observedAt":"2026-10-19T12:00:00Z"},"complete":true,"matches":[],
        "contextSlots":[%s],"failures":[{"sourceReference":"bad","reasonType":"urn:test:bad"}]}
        """
            .formatted(slots);

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/calendar-observations")
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Refuses more than 8 MiB before parsing or invoking an acceptance service")
  void refusesOversizedJson() throws Exception {
    // Given
    byte[] body = new byte[8 * 1024 * 1024 + 1];
    Arrays.fill(body, (byte) ' ');

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/source-bindings/00000000-0000-4000-8000-000000000002/catalog-observations")
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response
        .andExpect(status().isPayloadTooLarge())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(calendars, catalogs, matches, standings);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "pools/00000000-0000-4000-8000-000000000002/calendar-observations",
        "pools/00000000-0000-4000-8000-000000000002/standings-observations",
        "source-bindings/00000000-0000-4000-8000-000000000002/catalog-observations",
        "matches/00000000-0000-4000-8000-000000000002/detail-observations",
        "clubs/00000000-0000-4000-8000-000000000002/detail-observations",
        "clubs/00000000-0000-4000-8000-000000000002/locality-observations"
      })
  @DisplayName("Every JSON ingestion envelope requires its generated mandatory context")
  void validatesEnvelope(String path) throws Exception {

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/" + path)
                .with(collector())
                .contentType("application/json")
                .content("{}"));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(calendars, catalogs, matches, standings);
  }

  @ParameterizedTest
  @ValueSource(strings = {"mobile-test", "collector-other-environment"})
  @DisplayName("A mobile or another environment's client cannot invoke sporting ingestion")
  void refusesWrongClient(String client) throws Exception {

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/calendar-observations")
                .with(
                    jwt()
                        .jwt(token -> token.claim("azp", client))
                        .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest")))
                .contentType("application/json")
                .content("{}"));

    // Then
    response.andExpect(status().isForbidden());
    verifyNoInteractions(calendars, catalogs, matches, standings);
  }

  @Test
  @DisplayName(
      "Returns canonical synchronous per-item outcomes without a job or multi-status response")
  void returnsCalendarOutcomes() throws Exception {
    // Given
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000002");
    when(calendars.accept(eq(pool), any()))
        .thenReturn(
            new ObservationOutcome.Calendar(
                List.of(
                    new ObservationOutcome(
                        "M1", ObservationOutcomeEnum.ACCEPTED, pool, null, null, null),
                    ObservationOutcome.refused("M2", false)),
                1,
                0,
                0,
                1,
                false));
    String body =
        """
        {"context":{"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":1,
        "observedAt":"2026-10-19T12:00:00Z"},"complete":true,"matches":[],"contextSlots":[],"failures":[]}
        """;

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/pools/" + pool + "/calendar-observations")
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.outcomes[0].sourceReference").value("M1"))
        .andExpect(jsonPath("$.outcomes[1].outcome").value("rejected"))
        .andExpect(jsonPath("$.acceptedCount").value(1))
        .andExpect(jsonPath("$.unchangedCount").value(0))
        .andExpect(jsonPath("$.staleCount").value(0))
        .andExpect(jsonPath("$.rejectedCount").value(1))
        .andExpect(jsonPath("$.absenceReconciled").value(false));
  }

  @Test
  @DisplayName("An invalid cycle scope is a non-cacheable conflict before item acceptance")
  void refusesInvalidCycleScope() throws Exception {
    // Given
    when(calendars.accept(any(), any()))
        .thenThrow(new CollectionConflictException("invalid-cycle-context"));
    String body =
        """
        {"context":{"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":1,
        "observedAt":"2026-10-19T12:00:00Z"},"complete":true,"matches":[],"contextSlots":[],"failures":[]}
        """;

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/calendar-observations")
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-cycle-context"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "\"publicationState\":\"not-published\",\"columns\":[\"Points\"],\"rows\":[]",
        "\"publicationState\":\"published\",\"columns\":[],\"rows\":[{\"sourceName\":\"Synthetic\",\"statistics\":{\"Points\":\"9\"}}]"
      })
  @DisplayName(
      "Refuses contradictory non-publication and undeclared statistic columns before writes")
  void refusesInvalidStandings(String table) throws Exception {
    // Given
    String body =
        "{\"context\":{\"cycleId\":\"00000000-0000-4000-8000-000000000001\",\"readOrdinal\":1,\"observedAt\":\"2026-10-19T12:00:00Z\"},"
            + table
            + "}";

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/standings-observations")
                .with(collector())
                .contentType("application/json")
                .content(body));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(standings);
  }

  @Test
  @DisplayName(
      "Maps a published table through the generated HTTP boundary with source column order")
  void acceptsStandings() throws Exception {
    // Given
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000002");
    when(standings.accept(eq(pool), any()))
        .thenReturn(
            new ObservationOutcome(
                "POOL", ObservationOutcomeEnum.ACCEPTED, pool, null, null, null));
    String body =
        """
        {"context":{"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":1,"observedAt":"2026-10-19T12:00:00Z"},
        "publicationState":"published","columns":["Ratio","Points"],"rows":[{"sourceName":"Synthetic","position":7,"statistics":{"Ratio":"∞"}}]}
        """;

    // When
    mvc.perform(
            post("/ingestion/pools/" + pool + "/standings-observations")
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.outcome").value("accepted"));

    // Then
    ArgumentCaptor<StandingsObservation> submitted =
        ArgumentCaptor.forClass(StandingsObservation.class);
    Mockito.verify(standings).accept(eq(pool), submitted.capture());
    Assertions.assertThat(submitted.getValue().columns()).containsExactly("Ratio", "Points");
    Assertions.assertThat(submitted.getValue().rows().getFirst().statistics())
        .containsEntry("Ratio", "∞")
        .hasSize(1);
  }

  @Test
  @DisplayName(
      "Preserves omitted and explicit-null club fields through generated ingestion binding")
  void bindsClubDetailPresence() throws Exception {
    // Given
    UUID club = UUID.fromString("00000000-0000-4000-8000-000000000193");
    when(clubs.accept(eq(club), any()))
        .thenReturn(
            new ObservationOutcome(
                "00193", ObservationOutcomeEnum.ACCEPTED, club, null, null, null));
    String body =
        "{\"context\":{\"cycleId\":\"00000000-0000-4000-8000-000000000001\",\"readOrdinal\":1,\"observedAt\":\"2026-10-24T12:00:00Z\"},\"email\":null,\"city\":\"Paris\"}";

    // When
    mvc.perform(
            post("/ingestion/clubs/{id}/detail-observations", club)
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"));

    // Then
    ArgumentCaptor<SportingPresentation.ClubObservation> observation =
        ArgumentCaptor.forClass(SportingPresentation.ClubObservation.class);
    Mockito.verify(clubs).accept(eq(club), observation.capture());
    Assertions.assertThat(
            observation
                .getValue()
                .fields()
                .get(SportingPresentation.ContactField.EMAIL)
                .isPresent())
        .isTrue();
    Assertions.assertThat(
            observation.getValue().fields().get(SportingPresentation.ContactField.EMAIL).get())
        .isNull();
    Assertions.assertThat(
            observation
                .getValue()
                .fields()
                .get(SportingPresentation.ContactField.PHONE)
                .isPresent())
        .isFalse();
  }

  @Test
  @DisplayName("Binds exact locality revision and paired coordinates through generated ingestion")
  void bindsClubLocality() throws Exception {
    // Given
    UUID club = UUID.fromString("00000000-0000-4000-8000-000000000193");
    when(localities.accept(eq(club), any()))
        .thenReturn(
            new ObservationOutcome(
                "00193", ObservationOutcomeEnum.ACCEPTED, club, null, null, null));
    String body =
        "{\"context\":{\"cycleId\":\"00000000-0000-4000-8000-000000000001\",\"readOrdinal\":1,\"observedAt\":\"2026-10-24T12:00:00Z\"},\"localityRevision\":\"7\",\"outcome\":\"located\",\"latitude\":48.86,\"longitude\":2.34}";

    // When
    mvc.perform(
            post("/ingestion/clubs/{id}/locality-observations", club)
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isOk());

    // Then
    ArgumentCaptor<SportingPresentation.LocalityObservation> observation =
        ArgumentCaptor.forClass(SportingPresentation.LocalityObservation.class);
    Mockito.verify(localities).accept(eq(club), observation.capture());
    Assertions.assertThat(observation.getValue().localityRevision()).isEqualTo("7");
    Assertions.assertThat(observation.getValue().latitude()).isEqualTo(48.86);
    Assertions.assertThat(observation.getValue().longitude()).isEqualTo(2.34);
  }

  @Test
  @DisplayName("Accepts actual source-image bytes independently from their declared PNG/JPEG type")
  void bindsSourceImageBytes() throws Exception {
    // Given
    UUID team = UUID.fromString("00000000-0000-4000-8000-000000000193");
    byte[] content = SportingImageFixture.image("PNG", 0x112233);
    when(images.acceptSource(eq(team), any(), any()))
        .thenReturn(
            new ObservationOutcome("193", ObservationOutcomeEnum.ACCEPTED, team, null, null, null));

    // When
    mvc.perform(
            post("/ingestion/teams/{id}/source-logo-observations", team)
                .with(collector())
                .queryParam("cycleId", "00000000-0000-4000-8000-000000000001")
                .queryParam("readOrdinal", "1")
                .queryParam("observedAt", "2026-10-24T12:00:00Z")
                .queryParam("providerPublishedAt", "2026-10-23T12:00:00Z")
                .contentType("image/jpeg")
                .content(content))
        .andExpect(status().isOk());

    // Then
    ArgumentCaptor<SportingPresentation.Image> image =
        ArgumentCaptor.forClass(SportingPresentation.Image.class);
    ArgumentCaptor<MatchObservation.Context> context =
        ArgumentCaptor.forClass(MatchObservation.Context.class);
    Mockito.verify(images).acceptSource(eq(team), context.capture(), image.capture());
    Assertions.assertThat(image.getValue().bytes()).isEqualTo(content);
    Assertions.assertThat(image.getValue().mediaType()).isEqualTo("image/png");
    Assertions.assertThat(context.getValue().providerPublishedAt())
        .isEqualTo(java.time.OffsetDateTime.parse("2026-10-23T12:00:00Z"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"application/json", "image/gif"})
  @DisplayName("Rejects unsupported source-image media types without an image transaction")
  void refusesUnsupportedSourceImageMedia(String type) throws Exception {
    // Given
    UUID team = UUID.fromString("00000000-0000-4000-8000-000000000193");

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/teams/{id}/source-logo-observations", team)
                .with(collector())
                .queryParam("cycleId", "00000000-0000-4000-8000-000000000001")
                .queryParam("readOrdinal", "1")
                .queryParam("observedAt", "2026-10-24T12:00:00Z")
                .contentType(type)
                .content("bad"));

    // Then
    response.andExpect(status().isUnsupportedMediaType());
    verifyNoInteractions(images);
  }

  @Test
  @DisplayName("Rejects oversized source-image bytes before invoking any image use case")
  void boundsSourceImageBeforeConversion() throws Exception {
    // Given
    UUID team = UUID.fromString("00000000-0000-4000-8000-000000000193");
    byte[] oversized = new byte[SportingImageService.MAX_BYTES + 1];

    // When
    ResultActions response =
        mvc.perform(
            post("/ingestion/teams/{id}/source-logo-observations", team)
                .with(collector())
                .queryParam("cycleId", "00000000-0000-4000-8000-000000000001")
                .queryParam("readOrdinal", "1")
                .queryParam("observedAt", "2026-10-24T12:00:00Z")
                .contentType("image/png")
                .content(oversized));

    // Then
    response.andExpect(status().isPayloadTooLarge());
    verifyNoInteractions(images);
  }

  @Test
  @DisplayName("An audience turnover refuses detail acceptance with a safe conflict")
  void reportsAnnouncementAudienceConflict() throws Exception {
    // Given
    when(matches.detail(any()))
        .thenThrow(
            new com.blockout.backend.notifications.application
                .AnnouncementAudienceChangedException());
    String body =
        """
        {"context":{"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":2,
        "observedAt":"2026-10-24T12:00:00Z"},"facts":{}}
        """;

    // When / Then
    mvc.perform(
            post("/ingestion/matches/00000000-0000-4000-8000-000000000002/detail-observations")
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"));
  }

  /**
   * Supplies the dedicated validated client identity; signature validation has its owning suite.
   *
   * @return native security test identity with the actual ingestion authority
   */
  private RequestPostProcessor collector() {
    return jwt()
        .jwt(token -> token.claim("azp", "collector-test"))
        .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest"));
  }
}
