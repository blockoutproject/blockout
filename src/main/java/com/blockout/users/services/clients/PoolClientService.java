package com.blockout.users.services.clients;

import com.blockout.users.config.ApiClientProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class PoolClientService {

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

        apiClientService.post(url, Collections.emptyMap(), Void.class);
    }

    public void decrementFollowers(Long poolId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(poolId), "followers", "decrement")
                .queryParam("user_id", userId)
                .build()
                .toUriString();

        apiClientService.post(url, Collections.emptyMap(), Void.class);
    }
}