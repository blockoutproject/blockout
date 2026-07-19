package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.user.CustomUserDTO;
import com.blockout.mobilegateway.models.dto.user.CustomUserUpdateDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
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
public class UserClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getUser().getUrl();
    }

    public CustomUserDTO updateUser(String auth0Id, CustomUserUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(auth0Id)
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<CustomUserDTO> response = apiClientService.putMultipart(url, body, CustomUserDTO.class);
        return response.getBody();
    }

    public CustomUserDTO ensureCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("me")
                .build()
                .toUriString();

        ResponseEntity<CustomUserDTO> response = apiClientService.put(url, null, CustomUserDTO.class);
        return response.getBody();
    }

    public void deleteCurrentUser() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("me")
                .build()
                .toUriString();

        apiClientService.delete(url, Void.class);
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

        apiClientService.post(url, null, Void.class);
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

        apiClientService.delete(url, Void.class);
    }
}