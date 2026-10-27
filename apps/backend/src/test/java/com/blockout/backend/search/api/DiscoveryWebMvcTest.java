package com.blockout.backend.search.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.search.application.ReadSearch;
import com.blockout.backend.search.application.ReadSearchOptions;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.search.application.SearchUnavailableException;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Actual generated operations, binding and generated mappers with controlled application results.
 */
@WebMvcTest(DiscoveryController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  DiscoveryRequest.class,
  DiscoveryApiMapperImpl.class,
  ConsultationApiMapperImpl.class,
  DiscoveryExceptionHandler.class,
  ApiExceptionHandler.class
})
@DisplayName("Text search generated HTTP boundary")
class DiscoveryWebMvcTest {
  @Autowired MockMvc mvc;
  @MockitoBean ReadSearch reads;
  @MockitoBean private ReadSearchOptions options;

  @Test
  @DisplayName("Serializes only current club presentation with absent context omitted")
  void returnsCurrentClub() throws Exception {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
    when(reads.read(any(), any()))
        .thenReturn(
            new SearchPage(
                List.of(
                    new SearchPage.Summary(
                        new SearchPage.Club(
                            new ConsultationViews.Identity(id, "Current name", null, null), null),
                        null,
                        null)),
                null));

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", "source"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.clubs[0].club.id").value(id.toString()))
        .andExpect(jsonPath("$.clubs[0].club.name").value("Current name"))
        .andExpect(jsonPath("$.clubs[0].city").doesNotExist())
        .andExpect(jsonPath("$.nextCursor").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(strings = {"teams", "pools"})
  @DisplayName("Serializes current sporting summaries through each generated collection")
  void returnsSportingSummary(String resource) throws Exception {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000002");
    ConsultationViews.Identity identity =
        new ConsultationViews.Identity(id, "Current Eagles", "Eagles", "/current/logo");
    SeasonView season =
        new SeasonView(UUID.fromString("00000000-0000-4000-8000-000000000003"), 2040L, "2040/2041");
    ConsultationViews.Classification classification =
        new ConsultationViews.Classification(null, null, null);
    SearchPage.Summary summary =
        resource.equals("teams")
            ? new SearchPage.Summary(
                null,
                new ConsultationViews.TeamSummary(identity, season, classification, null, true),
                null)
            : new SearchPage.Summary(
                null,
                null,
                new ConsultationViews.PoolSummary(identity, season, classification, null, null));
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(summary), null));
    String identityField = resource.equals("teams") ? "team" : "pool";

    // When
    ResultActions response = mvc.perform(get("/" + resource).param("q", "source"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$." + resource + "[0]." + identityField + ".id").value(id.toString()))
        .andExpect(
            jsonPath("$." + resource + "[0]." + identityField + ".name").value("Current Eagles"))
        .andExpect(jsonPath("$." + resource + "[0].season.startYear").value(2040))
        .andExpect(jsonPath("$.nextCursor").doesNotExist());
  }

  @Test
  @DisplayName("Returns the shared retryable unavailable profile for an incomplete read")
  void exposesUnavailable() throws Exception {
    // Given
    when(reads.read(any(), any())).thenThrow(new SearchUnavailableException());

    // When
    ResultActions response = mvc.perform(get("/teams").param("q", "eagles"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.title").value("Service Unavailable"))
        .andExpect(jsonPath("$.status").value(503));
  }

  @Test
  @DisplayName("Rejects malformed continuations before application reads")
  void rejectsMalformedContinuation() throws Exception {
    // Given
    String malformed = "invalid";

    // When
    ResultActions response =
        mvc.perform(get("/pools").param("q", "eagles").param("cursor", malformed));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(reads);
  }

  @ParameterizedTest
  @CsvSource({
    "format,_6X6",
    "format,' 6x6 '",
    "format,''",
    "gender,FEMALE",
    "gender,' female '",
    "gender,''"
  })
  @DisplayName("Rejects noncanonical filter values before search evaluation")
  void rejectsNoncanonicalFilters(String parameter, String value) throws Exception {
    // Given
    String path = "/teams";

    // When
    ResultActions response = mvc.perform(get(path).param(parameter, value));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(jsonPath("$.instance").doesNotExist());
    verifyNoInteractions(reads, options);
  }
}
