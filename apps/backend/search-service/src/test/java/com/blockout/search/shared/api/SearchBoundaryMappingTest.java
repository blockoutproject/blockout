package com.blockout.search.shared.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.search.club.application.ClubSearchResult;
import com.blockout.search.club.application.ClubSearchService;
import com.blockout.search.generated.api.SearchApi;
import com.blockout.search.pool.application.PoolSearchResult;
import com.blockout.search.pool.application.PoolSearchService;
import com.blockout.search.shared.api.v1.LegacySearchController;
import com.blockout.search.shared.api.v1.LegacySearchJson;
import com.blockout.search.shared.api.v2.SearchApiMapper;
import com.blockout.search.shared.api.v2.SearchV2Controller;
import com.blockout.search.team.application.TeamSearchResult;
import com.blockout.search.team.application.TeamSearchService;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.junit.jupiter.api.Test;

class SearchBoundaryMappingTest {

    private final ClubSearchResult club = new ClubSearchResult("club-1", "Club", "club-logo", "Paris");
    private final TeamSearchResult team = new TeamSearchResult(
            1L, "Team", "TM", "club-1", "Club", "Paris", "team-logo", "Division", "SIX", "M", "2026");
    private final PoolSearchResult pool = new PoolSearchResult(
            2L, "Pool", "PL", "Division", "L", "League", "2026", "SIX", "M", "pool-logo");

    @Test
    void v2ImplementsTheGeneratedBoundaryAndUsesBoundedWrappers() {
        SearchV2Controller controller = new SearchV2Controller(
                new ClubSearchService(query -> java.util.List.of(club)),
                new TeamSearchService(filters -> java.util.List.of(team)),
                new PoolSearchService(filters -> java.util.List.of(pool)),
                new SearchApiMapper());

        assertThat(controller).isInstanceOf(SearchApi.class);
        assertThat(controller.searchClubs("club").getBody().getItems()).singleElement().satisfies(result -> {
            assertThat(result.getId()).isEqualTo("club-1");
            assertThat(result.getName()).isEqualTo("Club");
        });
        assertThat(controller.searchTeams("team", "2026", 1L, FormatEnum.SIX, GenderEnum.M)
                        .getBody().getItems())
                .singleElement().satisfies(result -> {
                    assertThat(result.getName()).isEqualTo("Team");
                    assertThat(result.getFormat()).isEqualTo(FormatEnum.SIX);
                    assertThat(result.getGender()).isEqualTo(GenderEnum.M);
                });
    }

    @Test
    void v1RetainsRawArraysSnakeCaseAndLegacyOnlyFields() throws Exception {
        LegacySearchController controller = new LegacySearchController(
                new ClubSearchService(query -> java.util.List.of(club)),
                new TeamSearchService(filters -> java.util.List.of(team)),
                new PoolSearchService(filters -> java.util.List.of(pool)),
                new LegacySearchJson());

        assertThat(controller.searchTeams("team", "2026", 1L, "SIX", "M").getBody())
                .isEqualTo("[{\"id\":1,\"name\":\"Team\",\"short_name\":\"TM\",\"club_id\":\"club-1\","
                        + "\"club_name\":\"Club\",\"club_city\":\"Paris\",\"logo_url\":\"team-logo\","
                        + "\"division_name\":\"Division\",\"format\":\"SIX\",\"gender\":\"M\","
                        + "\"season\":\"2026\"}]");
    }

    @Test
    void canonicalMappingContainsUnknownStoredEnumsWithoutFailingTheSearch() {
        SearchApiMapper mapper = new SearchApiMapper();
        TeamSearchResult result = new TeamSearchResult(
                1L, "Team", "TM", "club-1", "Club", "Paris", "logo", "Division", "unexpected", "other", "2026");

        assertThat(mapper.toResponse(result).getFormat()).isNull();
        assertThat(mapper.toResponse(result).getGender()).isNull();
    }
}
