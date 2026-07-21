package com.blockout.search.search.api;

import com.blockout.search.search.application.SearchApplicationService;
import com.blockout.search.search.application.queries.FilteredSearchQuery;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SearchControllerUnitTest {

    @Mock
    private SearchApplicationService searchApplicationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new ClubSearchController(searchApplicationService),
                new TeamSearchController(searchApplicationService),
                new PoolSearchController(searchApplicationService))
            .build();
    }

    @Test
    void keepsTheClubSearchRouteAndCamelCaseResponse() throws Exception {
        when(searchApplicationService.searchClubs("block"))
            .thenReturn(List.of(new ClubSearchResult("club-1", "Block Club", "logo.png", "Paris")));

        mockMvc.perform(get("/api/v1/search/clubs").param("query", "block"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("club-1"))
            .andExpect(jsonPath("$[0].logoUrl").value("logo.png"));
    }

    @Test
    void keepsTheTeamFiltersAndResponseShape() throws Exception {
        var query = new FilteredSearchQuery("paris", "2026/2027", 7L, "SIX", "F");
        when(searchApplicationService.searchTeams(query)).thenReturn(List.of(new TeamSearchResult(
            1L, "Team", "T", "club-1", "Club", "Paris", null, "Division", "SIX", "F", "2026/2027")));

        mockMvc.perform(get("/api/v1/search/teams")
                .param("query", "paris")
                .param("season", "2026/2027")
                .param("divisionId", "7")
                .param("format", "SIX")
                .param("gender", "F"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].clubId").value("club-1"))
            .andExpect(jsonPath("$[0].divisionName").value("Division"));
        verify(searchApplicationService).searchTeams(query);
    }

    @Test
    void keepsThePoolRouteAndReturnsAnEmptyJsonArray() throws Exception {
        var query = new FilteredSearchQuery("", null, null, null, null);
        when(searchApplicationService.searchPools(query)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/search/pools").param("query", ""))
            .andExpect(status().isOk())
            .andExpect(content().json("[]"));
        verify(searchApplicationService).searchPools(query);
    }
}
