package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.exceptions.PoolNotFoundException;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.HttpClientErrorException;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public PoolDTO getPoolById(Long id) {
        String baseUrl = apiClientProperties.getPool().getUrl();
        String url = baseUrl + "/" + id;

        logger.info("Calling getPoolById", keyValue("id", id), keyValue("url", url));

        try {
            ResponseEntity<PoolDTO> response = apiClientService.get(url, PoolDTO.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            logger.warn("Pool not found", keyValue("id", id), keyValue("url", url));
            throw new PoolNotFoundException(id);
        } catch (Exception e) {
            logger.error("Failed to fetch pool", keyValue("id", id), keyValue("url", url), keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération de la pool", e);
        }
    }

    public List<PoolDTO> getPoolsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }

        String baseUrl = apiClientProperties.getPool().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                .build()
                .toUriString();

        logger.info("Calling getPoolsByIds", keyValue("ids", ids), keyValue("url", url));

        try {
            ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
            return response.getBody() != null ? Arrays.asList(response.getBody()) : Collections.emptyList();
        } catch (Exception e) {
            logger.error("Failed to fetch pools", keyValue("ids", ids), keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération de la pool", e);
        }
    }
}