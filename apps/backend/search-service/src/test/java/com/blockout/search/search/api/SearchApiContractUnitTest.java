package com.blockout.search.search.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.search.search.api.mappers.SearchApiMapper;
import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.api.models.PoolSearchInternalResponse;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** Verifies the generated Search transport shapes produced by the API mapper. */
@DisplayName("Search API contract mapping")
class SearchApiContractUnitTest {

  private final ObjectMapper objectMapper = JsonMapper.builder().build();
  private final SearchApiMapper mapper = Mappers.getMapper(SearchApiMapper.class);

  /** Verifies the established camelCase Club search response. */
  @Test
  @DisplayName("serializes the existing Club search shape")
  void mapsAndSerializesClubResultWithTheExistingCamelCaseShape() throws Exception {
    ClubSearchInternalResponse response =
        mapper.toInternalResponse(
            new ClubSearchResult("club-1", "Block Club", "logo.png", "Paris"));
    JsonNode json = objectMapper.valueToTree(response);

    assertThat(json)
        .isEqualTo(
            objectMapper.readTree(
                "{\"id\":\"club-1\",\"name\":\"Block Club\",\"logoUrl\":\"logo.png\",\"city\":\"Paris\"}"));
  }

  /** Verifies that Team index-only fields remain outside the API response. */
  @Test
  @DisplayName("omits Team index-only fields")
  void mapsAndSerializesTeamResultWithoutLeakingIndexOnlyFields() throws Exception {
    TeamSearchInternalResponse response =
        mapper.toInternalResponse(
            new TeamSearchResult(
                12L,
                "Block Club One",
                "BC1",
                "club-1",
                "Block Club",
                "Paris",
                "logo.png",
                "National 1",
                "SIX",
                "M",
                "2026/2027"));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"clubId\":\"club-1\"", "\"divisionName\":\"National 1\"");
    assertThat(json).doesNotContain("divisionId");
  }

  /** Verifies that Pool index-only fields remain outside the API response. */
  @Test
  @DisplayName("omits Pool index-only fields")
  void mapsAndSerializesPoolResultWithoutLeakingIndexOnlyFields() throws Exception {
    PoolSearchInternalResponse response =
        mapper.toInternalResponse(
            new PoolSearchResult(
                42L,
                "Pool A",
                "A",
                "National 1",
                "LNV",
                "Ligue nationale",
                "2026/2027",
                "SIX",
                "F",
                "logo.png"));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"leagueCode\":\"LNV\"", "\"logoUrl\":\"logo.png\"");
    assertThat(json).doesNotContain("divisionId");
  }
}
