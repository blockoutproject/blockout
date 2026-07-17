package com.blockout.search;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.search.club.application.ClubSearchResult;
import com.blockout.search.club.application.ClubSearchService;
import com.blockout.search.pool.application.PoolSearchResult;
import com.blockout.search.pool.application.PoolSearchService;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.team.application.TeamSearchResult;
import com.blockout.search.team.application.TeamSearchService;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class SearchApplicationServiceTest {

    @Test
    void returnsStoreResultsWithoutChangingThem() {
        ClubSearchResult result = new ClubSearchResult("club-1", "Club", "logo", "Paris");
        ClubSearchService service = new ClubSearchService(query -> List.of(result));

        assertThat(service.search("volley")).containsExactly(result);
    }

    @Test
    void preservesTheEmptyListFallbackForEveryStoreFailure() {
        ClubSearchService service = new ClubSearchService(query -> {
            throw new IllegalStateException("unavailable");
        });

        assertThat(service.search("volley")).isEmpty();
    }

    @Test
    void passesTeamAndPoolFiltersWithoutNormalization() {
        SearchFilters filters = new SearchFilters("  volley  ", " 2026 ", 42L, "custom", "unknown");
        AtomicReference<SearchFilters> teamFilters = new AtomicReference<>();
        AtomicReference<SearchFilters> poolFilters = new AtomicReference<>();
        TeamSearchResult team = new TeamSearchResult(
                1L, "Team", "T", "club-1", "Club", "Paris", "logo", "Division", "6x6", "mixed", "2026");
        PoolSearchResult pool = new PoolSearchResult(
                2L, "Pool", "P", "Division", "L", "League", "2026", "6x6", "mixed", "logo");
        TeamSearchService teamService = new TeamSearchService(value -> {
            teamFilters.set(value);
            return List.of(team);
        });
        PoolSearchService poolService = new PoolSearchService(value -> {
            poolFilters.set(value);
            return List.of(pool);
        });

        assertThat(teamService.search(filters)).containsExactly(team);
        assertThat(poolService.search(filters)).containsExactly(pool);
        assertThat(teamFilters).hasValue(filters);
        assertThat(poolFilters).hasValue(filters);
    }
}
