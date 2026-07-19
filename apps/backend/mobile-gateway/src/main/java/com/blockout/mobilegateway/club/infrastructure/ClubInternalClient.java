package com.blockout.mobilegateway.club.infrastructure;

import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class ClubInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getClub().getUrl();
    }

    @Cacheable(value = "clubById", key = "#id")
    public ClubResponse getClubById(String id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id)
                .build().toUriString();

        ResponseEntity<ClubResponse> response = internalApiClient.get(url, ClubResponse.class);
        return response.getBody();
    }

    @Cacheable(value = "clubLogoById", key = "#id")
    public String getClubLogoUrl(String id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id, "logo")
                .build().toUriString();

        ResponseEntity<String> response = internalApiClient.get(url, String.class);
        String body = response.getBody();

        return (response.getStatusCode() == HttpStatus.NO_CONTENT || body == null || body.isBlank()) ? null : body;
    }

    @Caching(put = {
            @CachePut(value = "clubById", key = "#id")
    }, evict = {
            @CacheEvict(value = "clubLogoById", key = "#id")
    })
    public ClubResponse updateClub(String id, UpdateClubRequest dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id)
                .build().toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<ClubResponse> response = internalApiClient.putMultipart(url, body, ClubResponse.class);
        return response.getBody();
    }
}
