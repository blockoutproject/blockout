package com.blockout.search.search.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.search.search.api.mappers.SearchApiMapper;
import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.api.models.PoolSearchInternalResponse;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SearchApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsAndSerializesClubResultWithTheExistingCamelCaseShape() throws Exception {
        ClubSearchInternalResponse response = SearchApiMapper.toInternalResponse(
                new ClubSearchResult("club-1", "Block Club", "logo.png", "Paris"));

        assertThat(objectMapper.writeValueAsString(response))
                .isEqualTo("{\"id\":\"club-1\",\"name\":\"Block Club\",\"logoUrl\":\"logo.png\",\"city\":\"Paris\"}");
    }

    @Test
    void mapsAndSerializesTeamResultWithoutLeakingIndexOnlyFields() throws Exception {
        TeamSearchInternalResponse response = SearchApiMapper.toInternalResponse(new TeamSearchResult(
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

    @Test
    void mapsAndSerializesPoolResultWithoutLeakingIndexOnlyFields() throws Exception {
        PoolSearchInternalResponse response = SearchApiMapper.toInternalResponse(new PoolSearchResult(
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
