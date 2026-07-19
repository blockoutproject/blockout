package com.blockout.users.services.clients;

import com.blockout.users.config.ApiClientProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    private String baseUrl() {
        return apiClientProperties.getTeam().getUrl();
    }

    public void incrementFollowers(Long teamId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(teamId), "followers", "increment")
                .queryParam("userId", userId)
                .build()
                .toUriString();

        apiClientService.post(url, Collections.emptyMap(), Void.class);
    }

    public void decrementFollowers(Long teamId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(teamId), "followers", "decrement")
                .queryParam("userId", userId)
                .build()
                .toUriString();

        apiClientService.post(url, Collections.emptyMap(), Void.class);
    }
}