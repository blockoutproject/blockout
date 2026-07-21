package com.blockout.users.user.infrastructure.http;

import com.blockout.users.config.ApiClientProperties;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.ports.FollowerCounter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

@Component
@RequiredArgsConstructor
public class HttpFollowerCounter implements FollowerCounter {

    private final ApiClientProperties properties;
    private final RestTemplate forwardRestTemplate;

    @Override
    public void increment(EntityType entityType, Long entityId, Long userId) {
        post(entityType, entityId, userId, "increment");
    }

    @Override
    public void decrement(EntityType entityType, Long entityId, Long userId) {
        post(entityType, entityId, userId, "decrement");
    }

    private void post(EntityType entityType, Long entityId, Long userId, String operation) {
        String baseUrl = entityType == EntityType.TEAM
            ? properties.getTeam().getUrl()
            : properties.getPool().getUrl();
        String url = UriComponentsBuilder.fromUriString(baseUrl)
            .pathSegment(entityId.toString(), "followers", operation)
            .queryParam("userId", userId)
            .build()
            .toUriString();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        forwardRestTemplate.exchange(
            url, HttpMethod.POST, new HttpEntity<>(Collections.emptyMap(), headers), Void.class);
    }
}
