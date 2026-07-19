package com.blockout.search.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.search.search.application.ports.SearchReader;
import com.blockout.search.search.application.queries.FilteredSearchQuery;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SearchApplicationServiceUnitTest {

    @Mock
    private SearchReader searchReader;

    private SearchApplicationService service;

    @BeforeEach
    void setUp() {
        service = new SearchApplicationService(searchReader);
    }

    @Test
    void delegatesClubSearchToTheClubReadBoundary() {
        var expected = List.of(new ClubSearchResult("club-1", "Block Club", null, "Paris"));
        when(searchReader.searchClubs("block")).thenReturn(expected);

        assertThat(service.searchClubs("block")).isEqualTo(expected);
        verify(searchReader).searchClubs("block");
    }

    @Test
    void delegatesTheSameFilteredQueryToTeamAndPoolBoundaries() {
        var query = new FilteredSearchQuery("paris", "2026/2027", 7L, "SIX", "F");
        var teams = List.of(new TeamSearchResult(
                1L, "Team", "T", "club-1", "Club", "Paris", null, "Division", "SIX", "F", "2026/2027"));
        var pools = List.of(new PoolSearchResult(
                2L, "Pool", "P", "Division", "LNV", "League", "2026/2027", "SIX", "F", null));
        when(searchReader.searchTeams(query)).thenReturn(teams);
        when(searchReader.searchPools(query)).thenReturn(pools);

        assertThat(service.searchTeams(query)).isEqualTo(teams);
        assertThat(service.searchPools(query)).isEqualTo(pools);
        verify(searchReader).searchTeams(query);
        verify(searchReader).searchPools(query);
    }
}
