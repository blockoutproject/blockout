package com.blockout.backend.search.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.search.application.ReadSearch;
import com.blockout.backend.search.application.ReadSearchOptions;
import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import com.blockout.backend.search.application.SearchEngine;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.search.application.SearchUnavailableException;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
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
  HttpConfiguration.class,
  DiscoveryRequest.class,
  DiscoveryApiMapperImpl.class,
  ConsultationApiMapperImpl.class,
  DiscoveryExceptionHandler.class,
  ApiExceptionHandler.class
})
@DisplayName("Text search generated HTTP boundary")
class DiscoveryWebMvcTest {
  @Autowired MockMvc mvc;
  @Autowired private DiscoveryRequest requests;
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

  @ParameterizedTest
  @ValueSource(strings = {"/pools?q=eagles&cursor=invalid", "/teams?q=Volley&cursor=invalid"})
  @DisplayName("Rejects malformed continuations before application reads")
  void rejectsMalformedContinuation(String path) throws Exception {
    // Given
    // The parameter supplies the exact malformed continuation request.

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads);
  }

  @ParameterizedTest
  @CsvSource({
    "format,future",
    "format,_6X6",
    "format,' 6x6 '",
    "format,''",
    "gender,FEMALE",
    "gender,' female '",
    "gender,''",
    "gender,future"
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

  @ParameterizedTest
  @ValueSource(strings = {"/clubs", "/teams", "/pools"})
  @DisplayName("Accepts 200 Unicode characters at each generated binding")
  void acceptsUnicodeLimit(String path) throws Exception {
    // Given
    String text = "🏐".repeat(200);
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response = mvc.perform(get(path).param("q", text));

    // Then
    response.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    ArgumentCaptor<SearchContext> selection = ArgumentCaptor.forClass(SearchContext.class);
    verify(reads).read(selection.capture(), isNull());
    assertThat(selection.getValue().text()).isEqualTo(text);
  }

  @ParameterizedTest
  @ValueSource(strings = {"x", "🏐"})
  @DisplayName("Rejects input beyond 200 Unicode characters without truncation")
  void rejectsOverLimit(String character) throws Exception {
    // Given
    String text = character.repeat(201);

    // When
    ResultActions response = mvc.perform(get("/teams").param("q", text));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(reads);
  }

  @Test
  @DisplayName("Normalizes accepted text even when lowercase expands beyond the wire limit")
  void acceptsExpandingCase() throws Exception {
    // Given
    String text = "İ".repeat(200);
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response = mvc.perform(get("/teams").param("q", text));

    // Then
    response.andExpect(status().isOk());
    ArgumentCaptor<SearchContext> selection = ArgumentCaptor.forClass(SearchContext.class);
    verify(reads).read(selection.capture(), isNull());
    assertThat(selection.getValue().text()).isEqualTo("i\u0307".repeat(200));
  }

  @ParameterizedTest
  @ValueSource(strings = {"\u0000", "\uFEFF"})
  @DisplayName("Keeps non-whitespace control and format characters in textual mode")
  void keepsNonWhitespaceText(String text) throws Exception {
    // Given
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response = mvc.perform(get("/teams").param("q", text));

    // Then
    response.andExpect(status().isOk());
    ArgumentCaptor<SearchContext> selection = ArgumentCaptor.forClass(SearchContext.class);
    verify(reads).read(selection.capture(), isNull());
    assertThat(selection.getValue().examples()).isFalse();
    assertThat(selection.getValue().text()).isEqualTo(text);
  }

  @ParameterizedTest
  @ValueSource(strings = {"", " ", "\t\u2003"})
  @DisplayName("Empty or whitespace text selects current examples without continuation")
  void bindsCurrentExamples(String text) throws Exception {
    // Given
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", text));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.nextCursor").doesNotExist());
    ArgumentCaptor<SearchContext> selection = ArgumentCaptor.forClass(SearchContext.class);
    verify(reads).read(selection.capture(), isNull());
    assertThat(selection.getValue().examples()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(strings = {"", " \t\u2003"})
  @DisplayName("Current examples reject even a valid textual continuation")
  void rejectsExampleContinuation(String text) throws Exception {
    // Given
    String cursor = requests.encode(new SearchContinuation(1.5, new UUID(0, 1)));

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", text).param("cursor", cursor));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(reads);
  }

  @ParameterizedTest
  @ValueSource(strings = {"/teams?seasonId=invalid", "/teams?cursor=invalid"})
  @DisplayName("Rejects malformed generated values and incompatible modes")
  void rejectsInvalidSelection(String path) throws Exception {
    // Given
    // Each supplied URL is an invalid generated request shape.

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(reads);
  }

  @Test
  @DisplayName("Passes native continuation positions independently of the current selection")
  void bindsCursorPosition() throws Exception {
    // Given
    UUID positionId = UUID.fromString("00000000-0000-4000-8000-000000000001");
    String cursor = requests.encode(new SearchContinuation(1.5, positionId));
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions same =
        mvc.perform(get("/teams").param("q", "  étoile\tvolley ").param("cursor", cursor));
    ResultActions differentResource =
        mvc.perform(get("/pools").param("q", "étoile volley").param("cursor", cursor));
    ResultActions differentText =
        mvc.perform(get("/teams").param("q", "different").param("cursor", cursor));

    // Then
    same.andExpect(status().isOk());
    differentResource.andExpect(status().isOk());
    differentText.andExpect(status().isOk());
    ArgumentCaptor<SearchContext> selections = ArgumentCaptor.forClass(SearchContext.class);
    ArgumentCaptor<SearchEngine.Position> positions =
        ArgumentCaptor.forClass(SearchEngine.Position.class);
    verify(reads, times(3)).read(selections.capture(), positions.capture());
    assertThat(selections.getAllValues())
        .extracting(SearchContext::resource, SearchContext::text)
        .containsExactly(
            tuple(SearchContext.Resource.TEAM, "étoile volley"),
            tuple(SearchContext.Resource.POOL, "étoile volley"),
            tuple(SearchContext.Resource.TEAM, "different"));
    assertThat(positions.getAllValues()).containsOnly(new SearchEngine.Position(1.5, positionId));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "null",
        "[]",
        "{\"context\":null,\"score\":1,\"id\":null}",
        "{\"future\":true}"
      })
  @DisplayName("Rejects malformed decoded cursor structures")
  void rejectsCursorStructure(String payload) throws Exception {
    // Given
    String cursor =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(payload.getBytes(StandardCharsets.UTF_8));

    // When
    ResultActions response =
        mvc.perform(get("/teams").param("q", "Volley").param("cursor", cursor));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(reads);
  }

  @Test
  @DisplayName("Binds exact sporting wire filters without broadening them")
  void bindsSportingFilters() throws Exception {
    // Given
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000001");
    when(reads.read(any(), any())).thenReturn(new SearchPage(List.of(), null));

    // When
    ResultActions response =
        mvc.perform(
            get("/teams")
                .param("seasonId", season.toString())
                .param("format", "6x6")
                .param("gender", "female"));

    // Then
    response.andExpect(status().isOk());
    ArgumentCaptor<SearchContext> selection = ArgumentCaptor.forClass(SearchContext.class);
    verify(reads).read(selection.capture(), isNull());
    assertThat(selection.getValue().seasonId()).isEqualTo(season);
    assertThat(selection.getValue().format()).isEqualTo(SportFormatEnum._6X6);
    assertThat(selection.getValue().gender()).isEqualTo(SportGenderEnum.FEMALE);
  }
}
