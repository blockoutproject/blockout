package com.blockout.mobilegateway.pool.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.pool.application.commands.UpdatePoolCommand;
import com.blockout.mobilegateway.pool.application.views.PoolDetailsView;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
    private final PoolContractMapper contractMapper;

    private String baseUrl() {
        return apiClientProperties.getPool().getUrl();
    }

    @Cacheable(value = "poolById", key = "#id")
    public PoolDetailsView getPoolById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.pool.infrastructure.contract.models.PoolInternalResponse.class);
        return contractMapper.toResponse(response.getBody());
    }

    public List<PoolDetailsView> getPoolsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("ids", ids)
            .queryParam("active", true)
            .build()
            .toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.pool.infrastructure.contract.models.PoolInternalResponse[].class);
        var body = response.getBody();
        return body != null ? Arrays.stream(body).map(contractMapper::toResponse).toList() : Collections.emptyList();
    }

    @Caching(put = {
        @CachePut(value = "poolById", key = "#id")
    })
    public PoolDetailsView updatePool(Long id, UpdatePoolCommand command) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        var response = internalApiClient.put(url, contractMapper.toInternalRequest(command),
            com.blockout.mobilegateway.pool.infrastructure.contract.models.PoolInternalResponse.class);
        return contractMapper.toResponse(response.getBody());
    }
}
