package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolUpdateDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    private String baseUrl() {
        return apiClientProperties.getPool().getUrl();
    }

    @Cacheable(value = "poolById", key = "#id")
    public PoolDTO getPoolById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        ResponseEntity<PoolDTO> response = apiClientService.get(url, PoolDTO.class);
        return response.getBody();
    }

    public List<PoolDTO> getPoolsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("ids", ids)
                .queryParam("active", true)
                .build()
                .toUriString();

        ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
        PoolDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Caching(put = {
            @CachePut(value = "poolById", key = "#id")
    })
    public PoolDTO updatePool(Long id, PoolUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        ResponseEntity<PoolDTO> response = apiClientService.put(url, dto, PoolDTO.class);
        return response.getBody();
    }
}