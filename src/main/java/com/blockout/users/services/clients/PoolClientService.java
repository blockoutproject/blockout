package com.blockout.users.services.clients;

import com.blockout.users.config.ApiClientProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

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

    public void incrementFollowers(Long poolId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(poolId), "followers", "increment")
                .queryParam("user_id", userId)
                .build()
                .toUriString();

        logger.info("Calling pool#increment_followers",
                keyValue("action", "call_pool_increment_followers"),
                keyValue("poolId", poolId),
                keyValue("userId", userId),
                keyValue("url", url));

        ResponseEntity<Void> response =
                apiClientService.post(url, Collections.emptyMap(), Void.class);

        logger.info("Pool followers incremented",
                keyValue("action", "call_pool_increment_followers"),
                keyValue("status", response.getStatusCode()),
                keyValue("poolId", poolId),
                keyValue("userId", userId));
    }

    public void decrementFollowers(Long poolId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(poolId), "followers", "decrement")
                .queryParam("user_id", userId)
                .build()
                .toUriString();

        logger.info("Calling pool#decrement_followers",
                keyValue("action", "call_pool_decrement_followers"),
                keyValue("poolId", poolId),
                keyValue("userId", userId),
                keyValue("url", url));

        ResponseEntity<Void> response =
                apiClientService.post(url, Collections.emptyMap(), Void.class);

        logger.info("Pool followers decremented",
                keyValue("action", "call_pool_decrement_followers"),
                keyValue("status", response.getStatusCode()),
                keyValue("poolId", poolId),
                keyValue("userId", userId));
    }
}