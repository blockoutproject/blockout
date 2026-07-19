package com.blockout.mobilegateway.search.application;

import com.blockout.mobilegateway.search.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.search.api.models.TeamSearchResponse;
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
        List<PoolSearchResponse> expected = List.of(PoolSearchResponse.builder().id(10L).name("Elite").build());
        when(searchInternalClient.searchPools("paris", "2026/2027", 3L, "SIX", "F"))
                .thenReturn(expected);

        List<PoolSearchResponse> result = searchService.searchPools("paris", "2026/2027", 3L, "SIX", "F");

        assertThat(result).isSameAs(expected);
    }

    @Test
    void forwardsEveryTeamFilterToTheInternalSearchBoundary() {
        List<TeamSearchResponse> expected = List.of(TeamSearchResponse.builder().id(20L).name("Blockout").build());
        when(searchInternalClient.searchTeams("blockout", "2026/2027", 3L, "SIX", "M"))
                .thenReturn(expected);

        List<TeamSearchResponse> result = searchService.searchTeams("blockout", "2026/2027", 3L, "SIX", "M");

        assertThat(result).isSameAs(expected);
    }
}
