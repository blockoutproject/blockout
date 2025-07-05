package com.blockout.mobilegateway.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

    private final ApiClientProperties apiClientProperties;

    private final ApiClientService apiClientService;

    public List<PoolDTO> getPoolsByIds(Set<Long> ids) {
        if (ids.isEmpty())
            return Collections.emptyList();

        String poolApiUrl = apiClientProperties.getPool().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(poolApiUrl)
                .queryParam("ids", ids)
                .build()
                .toUriString();

        logger.info("Calling getPoolsByIds", keyValue("ids", ids), keyValue("url", url));

        try {
            ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
            return response.getBody() != null ? Arrays.asList(response.getBody()) : Collections.emptyList();
        } catch (Exception e) {
            logger.error("Failed to fetch pools", keyValue("error", e.getMessage()), e);
            return Collections.emptyList();
        }
    }

    public PoolDTO getPoolById(Long id) {
        String poolApiUrl = apiClientProperties.getPool().getUrl();
        String url = poolApiUrl + "/" + id;

        logger.info("Calling getPoolById", keyValue("id", id), keyValue("url", url));

        try {
            ResponseEntity<PoolDTO> response = apiClientService.get(url, PoolDTO.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to fetch pool",
                    keyValue("id", id),
                    keyValue("error", e.getMessage()), e);
            return null;
        }
    }
}