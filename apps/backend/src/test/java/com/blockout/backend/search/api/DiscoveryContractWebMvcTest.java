package com.blockout.backend.search.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.api.DiscoveryApi;
import com.blockout.backend.generated.mobile.model.ClubSearchResponse;
import com.blockout.backend.generated.mobile.model.PoolSearchResponse;
import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.SportingSearchOptionsResponse;
import com.blockout.backend.generated.mobile.model.TeamSearchResponse;
import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.RestController;

/**
 * Generated MVC boundary with test-only responses; no sporting endpoint is installed by this slice.
 */
@WebMvcTest(controllers = DiscoveryContractWebMvcTest.Adapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  DiscoveryRequest.class,
  DiscoveryContractWebMvcTest.Adapter.class
})
@DisplayName("Discovery generated request boundary")
class DiscoveryContractWebMvcTest {
  @Autowired MockMvc mvc;
  @Autowired Adapter adapter;
  @Autowired DiscoveryRequest requests;

  @ParameterizedTest
  @ValueSource(strings = {"/clubs", "/teams", "/pools"})
  @DisplayName("Accepts 200 Unicode characters at each generated binding")
  void acceptsUnicodeLimit(String path) throws Exception {
    // Given
    String text = "🏐".repeat(200);

    // When
    ResultActions response = mvc.perform(get(path).param("q", text));

    // Then
    response.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    assertThat(adapter.bound.context().text()).isEqualTo(text);
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
  }

  @Test
  @DisplayName("Normalizes accepted text even when lowercase expands beyond the wire limit")
  void acceptsExpandingCase() throws Exception {
    // Given
    String text = "İ".repeat(200);

    // When
    ResultActions response = mvc.perform(get("/teams").param("q", text));

    // Then
    response.andExpect(status().isOk());
    assertThat(adapter.bound.context().text()).isEqualTo("i\u0307".repeat(200));
  }

  @ParameterizedTest
  @ValueSource(strings = {"", " ", "\t"})
  @DisplayName("Rejects blank UUID examples alongside a valid retained identity")
  void rejectsBlankExample(String blank) throws Exception {
    // Given
    String retained = "00000000-0000-4000-8000-000000000001";

    // When
    ResultActions response = mvc.perform(get("/clubs").param("exampleIds", retained, blank));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"\u0000", "\uFEFF"})
  @DisplayName("Keeps non-whitespace control and format characters in textual mode")
  void keepsNonWhitespaceText(String text) throws Exception {
    // Given
    String retained = "00000000-0000-4000-8000-000000000001";

    // When
    ResultActions response =
        mvc.perform(get("/teams").param("q", text).param("exampleIds", retained));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Preserves ordered distinct retained examples and optional absence")
  void preservesExamples() throws Exception {
    // Given
    String first = "00000000-0000-4000-8000-000000000002";
    String second = "00000000-0000-4000-8000-000000000001";

    // When
    ResultActions response = mvc.perform(get("/clubs").param("exampleIds", first, second));

    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.nextCursor").doesNotExist());
    assertThat(adapter.bound.exampleIds())
        .containsExactly(UUID.fromString(first), UUID.fromString(second));
    assertThat(adapter.bound.context().examples()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/clubs?future=true",
        "/clubs?seasonId=00000000-0000-4000-8000-000000000001",
        "/teams?format=future",
        "/teams?seasonId=",
        "/teams?divisionId=1-1-1-1-1",
        "/teams?gender=future",
        "/teams?seasonId=invalid",
        "/teams?q=Volley&exampleIds=00000000-0000-4000-8000-000000000001",
        "/teams?cursor=invalid",
        "/teams?q=Volley&cursor=invalid",
        "/teams?exampleIds=00000000-0000-4000-8000-000000000001&exampleIds=00000000-0000-4000-8000-000000000001",
        "/teams?q=one&q=two",
        "/sporting-search-options?resourceType=club",
        "/sporting-search-options?resourceType=team&future=true"
      })
  @DisplayName("Rejects malformed shapes, unknown parameters and incompatible modes")
  void rejectsInvalidSelection(String path) throws Exception {
    // Given
    // Each supplied URL is an invalid generated request shape.

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Accepts continuation only for its original normalized selection")
  void bindsCursorToContext() throws Exception {
    // Given
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.TEAM, "ÉTOILE Volley", null, null, null, null, false);
    String cursor =
        requests.encode(
            new SearchContinuation(
                context, 1.5, UUID.fromString("00000000-0000-4000-8000-000000000001")));

    // When
    ResultActions same =
        mvc.perform(get("/teams").param("q", "  étoile\tvolley ").param("cursor", cursor));

    // Then
    same.andExpect(status().isOk());
    assertThat(adapter.bound.continuation().score()).isEqualTo(1.5);
    mvc.perform(get("/pools").param("q", "étoile volley").param("cursor", cursor))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/teams").param("q", "different").param("cursor", cursor))
        .andExpect(status().isBadRequest());
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
  }

  @Test
  @DisplayName("Binds exact sporting wire filters without broadening them")
  void bindsSportingFilters() throws Exception {
    // Given
    String season = "00000000-0000-4000-8000-000000000001";

    // When
    ResultActions response =
        mvc.perform(
            get("/teams")
                .param("seasonId", season)
                .param("format", "6x6")
                .param("gender", "female"));

    // Then
    response.andExpect(status().isOk());
    assertThat(adapter.bound.context().seasonId()).isEqualTo(UUID.fromString(season));
    assertThat(adapter.bound.context().format()).isEqualTo(SportFormatEnum._6X6);
    assertThat(adapter.bound.context().gender()).isEqualTo(SportGenderEnum.FEMALE);
  }

  /** Test-only story adapter exercises the actual generated interface and handwritten binder. */
  @RestController
  static class Adapter implements DiscoveryApi {
    private final DiscoveryRequest requests;
    private final HttpServletRequest request;
    DiscoveryRequest.Bound bound;

    /**
     * Supplies production binding and the current native request; responses remain controlled.
     *
     * @param requests production request binder
     * @param request MVC request proxy
     */
    Adapter(DiscoveryRequest requests, HttpServletRequest request) {
      this.requests = requests;
      this.request = request;
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<ClubSearchResponse> listClubs(
        String q, String cursor, Set<UUID> exampleIds, Boolean bypass) {
      bound =
          requests.bind(
              request,
              new SearchContext(SearchContext.Resource.CLUB, q, null, null, null, null, bypass),
              cursor,
              exampleIds);
      return ResponseEntity.ok()
          .header("Cache-Control", "no-store")
          .body(new ClubSearchResponse(List.of()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<TeamSearchResponse> listTeams(
        String q,
        String cursor,
        Set<UUID> exampleIds,
        UUID seasonId,
        UUID divisionId,
        SportFormatEnum format,
        SportGenderEnum gender,
        Boolean bypass) {
      bound =
          requests.bind(
              request,
              new SearchContext(
                  SearchContext.Resource.TEAM, q, seasonId, divisionId, format, gender, bypass),
              cursor,
              exampleIds);
      return ResponseEntity.ok()
          .header("Cache-Control", "no-store")
          .body(new TeamSearchResponse(List.of()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PoolSearchResponse> listPools(
        String q,
        String cursor,
        Set<UUID> exampleIds,
        UUID seasonId,
        UUID divisionId,
        SportFormatEnum format,
        SportGenderEnum gender,
        Boolean bypass) {
      bound =
          requests.bind(
              request,
              new SearchContext(
                  SearchContext.Resource.POOL, q, seasonId, divisionId, format, gender, bypass),
              cursor,
              exampleIds);
      return ResponseEntity.ok()
          .header("Cache-Control", "no-store")
          .body(new PoolSearchResponse(List.of()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<SportingSearchOptionsResponse> getSportingSearchOptions(
        SearchResourceTypeEnum resourceType, Boolean bypass) {
      requests.validateOptions(request);
      return ResponseEntity.ok()
          .header("Cache-Control", "no-store")
          .body(
              new SportingSearchOptionsResponse(
                  resourceType, List.of(), List.of(), Set.of(), Set.of()));
    }
  }
}
