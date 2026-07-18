package com.blockout.search;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.search.club.application.ClubSearchService;
import com.blockout.search.club.application.ClubSearchView;
import com.blockout.search.pool.application.PoolSearchService;
import com.blockout.search.pool.application.PoolSearchView;
import com.blockout.search.shared.application.FilteredSearchQuery;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.shared.application.SearchQuery;
import com.blockout.search.team.application.TeamSearchService;
import com.blockout.search.team.application.TeamSearchView;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class SearchApplicationServiceTest {

    @Test
    void passesRawQueriesAndReturnsStoreViewsInTheirOriginalOrder() {
        SearchQuery query = new SearchQuery("  volley  ");
        AtomicReference<SearchQuery> received = new AtomicReference<>();
        ClubSearchView first = new ClubSearchView("club-2", "Second", "logo-2", "Paris");
        ClubSearchView second = new ClubSearchView("club-1", "First", "logo-1", "Lyon");
        ClubSearchService service = new ClubSearchService(value -> {
            received.set(value);
            return List.of(first, second);
        });

        assertThat(service.search(query)).containsExactly(first, second);
        assertThat(received).hasValue(query);
    }

    @Test
    void preservesTheEmptyListFallbackForEveryStoreFailure() {
        ClubSearchService clubs = new ClubSearchService(query -> {
            throw new IllegalStateException("unavailable");
        });
        TeamSearchService teams = new TeamSearchService(query -> {
            throw new IllegalStateException("unavailable");
        });
        PoolSearchService pools = new PoolSearchService(query -> {
            throw new IllegalStateException("unavailable");
        });
        FilteredSearchQuery filtered = filteredQuery();

        assertThat(clubs.search(new SearchQuery("volley"))).isEmpty();
        assertThat(teams.search(filtered)).isEmpty();
        assertThat(pools.search(filtered)).isEmpty();
    }

    @Test
    void passesTeamAndPoolQueriesAndFiltersWithoutNormalization() {
        FilteredSearchQuery query = filteredQuery();
        AtomicReference<FilteredSearchQuery> teamQuery = new AtomicReference<>();
        AtomicReference<FilteredSearchQuery> poolQuery = new AtomicReference<>();
        TeamSearchView team = new TeamSearchView(
                1L, "Team", "T", "club-1", "Club", "Paris", "logo", "Division", "6x6", "mixed", "2026");
        PoolSearchView pool = new PoolSearchView(
                2L, "Pool", "P", "Division", "L", "League", "2026", "6x6", "mixed", "logo");
        TeamSearchService teamService = new TeamSearchService(value -> {
            teamQuery.set(value);
            return List.of(team);
        });
        PoolSearchService poolService = new PoolSearchService(value -> {
            poolQuery.set(value);
            return List.of(pool);
        });

        assertThat(teamService.search(query)).containsExactly(team);
        assertThat(poolService.search(query)).containsExactly(pool);
        assertThat(teamQuery).hasValue(query);
        assertThat(poolQuery).hasValue(query);
        assertThat(query.query().text()).isEqualTo("  volley  ");
        assertThat(query.filters().season()).isEqualTo(" 2026 ");
    }

    private FilteredSearchQuery filteredQuery() {
        return new FilteredSearchQuery(
                new SearchQuery("  volley  "),
                new SearchFilters(" 2026 ", 42L, "custom", "unknown"));
    }
}
