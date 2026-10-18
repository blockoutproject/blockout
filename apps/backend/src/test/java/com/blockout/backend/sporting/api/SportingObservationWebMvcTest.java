package com.blockout.backend.sporting.api;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.ingestion.model.ObserveMatchDetailRequest;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.MatchObservation;
import jakarta.validation.Valid;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Qualifies binding and mapping through a test-only adapter. Authentication filters belong to the
 * dedicated security suite, independently from these serialization cases.
 */
@WebMvcTest
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  SportingObservationMapperImpl.class,
  SportingObservationWebMvcTest.BindingAdapter.class
})
@DisplayName("Sporting observation HTTP binding")
class SportingObservationWebMvcTest {
  private static final String PATH =
      "/contract/sporting/matches/00000000-0000-4000-8000-000000000001";
  @Autowired private MockMvc mvc;

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"future\":\"private-synthetic-value\"}",
        "{\"result\":{\"state\":\"final\",\"future\":true}}",
        "{\"sets\":[{\"home\":25,\"away\":20,\"future\":true}]}",
        "{\"sets\":[{\"home\":25}]}",
        "{\"sets\":[null]}",
        "{\"referees\":[null]}",
        "{\"result\":{\"state\":\"future\"}}",
        "{\"result\":{}}",
        "{\"result\":{\"state\":\"final\",\"homeSets\":\"3\"}}",
        "{\"localDate\":\"2026-02-31\"}",
        "{\"localTime\":\"25:00\"}",
        "{\"timeZone\":null}"
      })
  @DisplayName("Rejects invalid or unknown nested facts before application mapping")
  void rejectsInvalidFacts(String facts) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
            {"context":{"cycleId":"00000000-0000-4000-8000-000000000002","readOrdinal":7,
            "observedAt":"2026-10-18T18:00:00Z"},"facts":%s}
            """
                    .formatted(facts));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().string(not(containsString("private-synthetic-value"))));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"facts\":{}}",
        "{\"context\":null,\"facts\":{}}",
        "{\"context\":{},\"facts\":{}}",
        "{\"context\":{\"cycleId\":\"00000000-0000-4000-8000-000000000002\",\"readOrdinal\":7,\"observedAt\":\"bad-date\"},\"facts\":{}}",
        "{\"context\":{\"cycleId\":\"00000000-0000-4000-8000-000000000002\",\"readOrdinal\":7,\"observedAt\":\"2026-10-18T18:00:00Z\",\"future\":true},\"facts\":{}}"
      })
  @DisplayName("Requires valid collection context independently from optional facts")
  void rejectsInvalidContext(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH).contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Keeps omitted and withdrawn facts distinct through binding and mapping")
  void preservesPresenceThroughHttp() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post(PATH)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
            {"context":{"cycleId":"00000000-0000-4000-8000-000000000002","readOrdinal":7,
            "observedAt":"2026-10-18T18:00:00Z"},"facts":{"result":null,"sets":[]}}
            """);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.matchId").value("00000000-0000-4000-8000-000000000001"))
        .andExpect(jsonPath("$.context.readOrdinal").value(7))
        .andExpect(jsonPath("$.facts.localDate").doesNotHaveJsonPath())
        .andExpect(jsonPath("$.facts.result").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.facts.sets").isEmpty());
  }

  /** Binds only under /contract in test sources; no business route or acceptance is implemented. */
  @RestController
  static class BindingAdapter {
    private final SportingObservationMapper mapper;

    /**
     * Uses the real generated Spring mapper in the controlled HTTP adapter.
     *
     * @param mapper boundary mapper under test
     */
    BindingAdapter(SportingObservationMapper mapper) {
      this.mapper = mapper;
    }

    /**
     * Echoes mapped input solely to observe binding, not to accept or persist sporting data.
     *
     * @param matchId synthetic addressed identity
     * @param request structurally validated generated request
     * @return mapped proposals, without business effects
     */
    @PostMapping("/contract/sporting/matches/{matchId}")
    MatchObservation bind(
        @PathVariable UUID matchId, @RequestBody @Valid ObserveMatchDetailRequest request) {
      return mapper.toObservation(matchId, request);
    }
  }
}
