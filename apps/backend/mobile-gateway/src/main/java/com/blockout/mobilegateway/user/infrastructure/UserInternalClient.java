package com.blockout.mobilegateway.user.infrastructure;

import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.user.api.models.UserResponse;
import com.blockout.mobilegateway.user.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class UserInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getUser().getUrl();
    }

    public UserResponse updateUser(String auth0Id, UpdateUserRequest dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(auth0Id)
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<UserResponse> response = internalApiClient.putMultipart(url, body, UserResponse.class);
        return response.getBody();
    }

    public UserResponse ensureCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("me")
                .build()
                .toUriString();

        ResponseEntity<UserResponse> response = internalApiClient.put(url, null, UserResponse.class);
        return response.getBody();
    }

    public void deleteCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("me")
                .build()
                .toUriString();

        internalApiClient.delete(url, Void.class);
    }

    @Caching(evict = {
            @CacheEvict(value = "teamById", key = "#entityId", condition = "#entityType == 'TEAM'"),
            @CacheEvict(value = "poolById", key = "#entityId", condition = "#entityType == 'POOL'")
    })
    public void follow(String auth0Id, String entityType, Long entityId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("favorites", "follow")
                .queryParam("entityType", entityType)
                .queryParam("entityId", entityId)
                .build()
                .toUriString();

        internalApiClient.post(url, null, Void.class);
    }

    @Caching(evict = {
            @CacheEvict(value = "teamById", key = "#entityId", condition = "#entityType == 'TEAM'"),
            @CacheEvict(value = "poolById", key = "#entityId", condition = "#entityType == 'POOL'")
    })
    public void unfollow(String auth0Id, String entityType, Long entityId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("favorites", "follow")
                .queryParam("entityType", entityType)
                .queryParam("entityId", entityId)
                .build()
                .toUriString();

        internalApiClient.delete(url, Void.class);
    }
}
