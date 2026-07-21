package com.blockout.mobilegateway.pool.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.pool.api.models.UpdatePoolRequest;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PoolInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;

    private String baseUrl() {
        return apiClientProperties.getPool().getUrl();
    }

    @Cacheable(value = "poolById", key = "#id")
    public PoolInternalResponse getPoolById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        ResponseEntity<PoolInternalResponse> response = internalApiClient.get(url, PoolInternalResponse.class);
        return response.getBody();
    }

    public List<PoolInternalResponse> getPoolsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("ids", ids)
            .queryParam("active", true)
            .build()
            .toUriString();

        ResponseEntity<PoolInternalResponse[]> response = internalApiClient.get(url, PoolInternalResponse[].class);
        PoolInternalResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Caching(put = {
        @CachePut(value = "poolById", key = "#id")
    })
    public PoolInternalResponse updatePool(Long id, UpdatePoolRequest dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        ResponseEntity<PoolInternalResponse> response = internalApiClient.put(url, dto, PoolInternalResponse.class);
        return response.getBody();
    }
}
