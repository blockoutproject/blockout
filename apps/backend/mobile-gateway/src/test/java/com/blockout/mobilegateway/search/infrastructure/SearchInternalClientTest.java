package com.blockout.mobilegateway.search.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.search.infrastructure.contract.models.PoolSearchInternalResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SearchInternalClientTest {

    @Test
    void sendsNativeCamelCaseFiltersToSearchService() {
        ApiClientProperties properties = new ApiClientProperties();
        properties.getSearch().setUrl("http://search-service:8088/api/v1/search");
        InternalApiClient apiClient = mock(InternalApiClient.class);
        when(apiClient.get(anyString(), eq(PoolSearchInternalResponse[].class)))
            .thenReturn(ResponseEntity.ok(new PoolSearchInternalResponse[0]));
        SearchInternalClient client = new SearchInternalClient(properties, apiClient, new SearchContractMapper());

        client.searchPools("paris", "2026/2027", 3L, "SIX", "F");

        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        verify(apiClient).get(url.capture(), eq(PoolSearchInternalResponse[].class));
        assertThat(url.getValue())
            .isEqualTo("http://search-service:8088/api/v1/search/pools?query=paris&season=2026/2027&divisionId=3&format=SIX&gender=F")
            .doesNotContain("division_id");
    }
}
