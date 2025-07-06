package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.pool.PoolDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<PoolDTO> listPools() {
        String url = apiClientProperties.getPool().getUrl();

        logger.info("Calling listPools endpoint",
                keyValue("action", "call_pool_list_endpoint"),
                keyValue("url", url));

        ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
        PoolDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}