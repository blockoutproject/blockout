package com.blockout.mobilegateway.user.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.blockout.mobilegateway.user.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.user.api.models.UserResponse;
import com.blockout.mobilegateway.user.infrastructure.contract.models.UserInternalResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Calls the User internal API and maps its generated contracts to gateway models.
 */
@Service
@RequiredArgsConstructor
public class UserInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final ObjectMapper objectMapper;
    private final UserContractMapper contractMapper;

    private String baseUrl() {
        return apiClientProperties.getUser().getUrl();
    }

    public UserResponse updateUser(String auth0Id, UpdateUserRequest dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(auth0Id)
            .build()
            .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(
            objectMapper,
            contractMapper.toInternalRequest(dto),
            image);

        ResponseEntity<UserInternalResponse> response = internalApiClient.putMultipart(
            url,
            body,
            UserInternalResponse.class);
        return contractMapper.toResponse(response.getBody());
    }

    public UserResponse ensureCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("me")
            .build()
            .toUriString();

        ResponseEntity<UserInternalResponse> response = internalApiClient.put(url, null, UserInternalResponse.class);
        return contractMapper.toResponse(response.getBody());
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
