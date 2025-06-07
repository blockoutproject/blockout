package com.blockout.workersearch.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.pool.PoolDTO;

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

        try {
            ResponseEntity<PoolDTO[]> response = apiClientService.get(url, PoolDTO[].class);
            PoolDTO[] body = response.getBody();
            List<PoolDTO> pools = body != null ? Arrays.asList(body) : Collections.emptyList();

            logger.info("Successfully fetched pools",
                    keyValue("count", pools.size()));

            return pools;
        } catch (Exception e) {
            logger.error("Failed to fetch pools from Pool API",
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            return Collections.emptyList();
        }
    }
}