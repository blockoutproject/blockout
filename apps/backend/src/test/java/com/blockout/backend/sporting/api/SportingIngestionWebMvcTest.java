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
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.service.CalendarAcceptanceService;
import com.blockout.backend.sporting.application.service.CatalogAcceptanceService;
import com.blockout.backend.sporting.application.service.MatchAcceptanceService;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Actual generated request binding; acceptance collaborators are isolated in the MVC slice. */
@WebMvcTest(SportingIngestionController.class)
@AutoConfigureMockMvc
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ApiExceptionHandler.class,
  CollectionExceptionHandler.class,
  SportingObservationMapperImpl.class,
  SportingObservationValidator.class,
  SportingJsonBodyAdvice.class
})
@DisplayName("Sporting ingestion request limits")
class SportingIngestionWebMvcTest {
  @Autowired private MockMvc mvc;
  @MockitoBean private MatchAcceptanceService matches;
  @MockitoBean private CalendarAcceptanceService calendars;
  @MockitoBean private CatalogAcceptanceService catalogs;

  @Test
  @DisplayName("Refuses a calendar whose combined collections exceed 1000 entries")
  void refusesCombinedOverflow() throws Exception {
    // Given
    String slot = "{\"sourceReference\":\"bye\",\"kind\":\"bye\"}";
    String slots = String.join(",", java.util.Collections.nCopies(1000, slot));
    String body =
        """
        {"context":{"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":1,
        "observedAt":"2026-10-19T12:00:00Z"},"complete":true,"matches":[],
        "contextSlots":[%s],"failures":[{"sourceReference":"bad","reasonType":"urn:test:bad"}]}
        """
            .formatted(slots);

    // When / Then
    mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/calendar-observations")
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Refuses more than 8 MiB before parsing or invoking an acceptance service")
  void refusesOversizedJson() throws Exception {
    // Given
    byte[] body = new byte[8 * 1024 * 1024 + 1];
    Arrays.fill(body, (byte) ' ');

    // When / Then
    mvc.perform(
            post("/ingestion/source-bindings/00000000-0000-4000-8000-000000000002/catalog-observations")
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isPayloadTooLarge())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(calendars, catalogs, matches);
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

    // When / Then
    mvc.perform(
            post("/ingestion/" + path)
                .with(collector())
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(calendars, catalogs, matches);
  }

  @ParameterizedTest
  @ValueSource(strings = {"mobile-test", "collector-other-environment"})
  @DisplayName("A mobile or another environment's client cannot invoke sporting ingestion")
  void refusesWrongClient(String client) throws Exception {

    // When / Then
    mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/calendar-observations")
                .with(
                    jwt()
                        .jwt(token -> token.claim("azp", client))
                        .authorities(new SimpleGrantedAuthority("SCOPE_sporting:ingest")))
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isForbidden());
    verifyNoInteractions(calendars, catalogs, matches);
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

    // When / Then
    mvc.perform(
            post("/ingestion/pools/" + pool + "/calendar-observations")
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.outcomes[0].sourceReference").value("M1"))
        .andExpect(jsonPath("$.outcomes[1].outcome").value("rejected"))
        .andExpect(jsonPath("$.acceptedCount").value(1))
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

    // When / Then
    mvc.perform(
            post("/ingestion/pools/00000000-0000-4000-8000-000000000002/calendar-observations")
                .with(collector())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-cycle-context"));
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
