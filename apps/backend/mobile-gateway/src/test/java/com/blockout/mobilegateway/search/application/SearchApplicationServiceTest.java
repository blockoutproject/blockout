package com.blockout.mobilegateway.search.application;

import com.blockout.mobilegateway.search.application.views.PoolSearchView;
import com.blockout.mobilegateway.search.application.views.TeamSearchView;
import com.blockout.mobilegateway.search.infrastructure.SearchInternalClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchApplicationServiceTest {

    @Mock
    private SearchInternalClient searchInternalClient;

    @InjectMocks
    private SearchApplicationService searchService;

    @Test
    void forwardsEveryPoolFilterToTheInternalSearchBoundary() {
        List<PoolSearchView> expected = List.of(
            new PoolSearchView(10L, "Elite", null, null, null, null, null, null, null, null));
        when(searchInternalClient.searchPools("paris", "2026/2027", 3L, "SIX", "F"))
            .thenReturn(expected);

        List<PoolSearchView> result = searchService.searchPools("paris", "2026/2027", 3L, "SIX", "F");

        assertThat(result).isSameAs(expected);
    }

    @Test
    void forwardsEveryTeamFilterToTheInternalSearchBoundary() {
        List<TeamSearchView> expected = List.of(
            new TeamSearchView(20L, "Blockout", null, null, null, null, null, null, null, null, null));
        when(searchInternalClient.searchTeams("blockout", "2026/2027", 3L, "SIX", "M"))
            .thenReturn(expected);

        List<TeamSearchView> result = searchService.searchTeams("blockout", "2026/2027", 3L, "SIX", "M");

        assertThat(result).isSameAs(expected);
    }
}
