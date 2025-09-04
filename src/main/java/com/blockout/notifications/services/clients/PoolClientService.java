package com.blockout.notifications.services.clients;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.pool.PoolDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public PoolDTO getPoolById(Long id) {
        String url = apiClientProperties.getPool().getUrl() + "/" + id;

        logger.info("Calling getPoolById", keyValue("id", id), keyValue("url", url));

        ResponseEntity<PoolDTO> response = apiClientService.getService(url, PoolDTO.class);
        return response.getBody();
    }
}