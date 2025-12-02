package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.pool.PoolDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<PoolDTO> listActivePools() {
        String baseUrl = apiClientProperties.getPool().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("active", true)
                .build()
                .toUriString();

        ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
        PoolDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}