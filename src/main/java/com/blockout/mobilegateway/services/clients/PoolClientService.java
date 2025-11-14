package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolUpdateDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

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

        logger.info("Calling pools#getById", keyValue("id", id), keyValue("url", url));

        ResponseEntity<PoolDTO> response = apiClientService.get(url, PoolDTO.class);
        return response.getBody();
    }

    public List<PoolDTO> getPoolsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("ids", ids)
                .queryParam("active", true)
                .build()
                .toUriString();

        logger.info("Calling pools#getByIds", keyValue("ids", ids), keyValue("url", url));

        ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
        PoolDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public PoolDTO updatePool(Long id, PoolUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        logger.info("Calling pools#update", keyValue("id", id), keyValue("url", url));

        ResponseEntity<PoolDTO> response = apiClientService.put(url, dto, PoolDTO.class);
        return response.getBody();
    }
}