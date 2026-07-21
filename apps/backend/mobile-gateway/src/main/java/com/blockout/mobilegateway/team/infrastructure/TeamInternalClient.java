package com.blockout.mobilegateway.team.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.blockout.mobilegateway.team.api.models.UpdateTeamRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeamInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getTeam().getUrl();
    }

    @Cacheable(value = "teamById", key = "#id")
    public TeamInternalResponse getTeamById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        ResponseEntity<TeamInternalResponse> response = internalApiClient.get(url, TeamInternalResponse.class);
        return response.getBody();
    }

    public List<TeamInternalResponse> getTeamsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("ids", ids)
            .queryParam("active", true)
            .build()
            .toUriString();

        ResponseEntity<TeamInternalResponse[]> response = internalApiClient.get(url, TeamInternalResponse[].class);
        TeamInternalResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Cacheable(value = "teamsByClubId", key = "#clubId")
    public List<TeamInternalResponse> getTeamsByClubId(String clubId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("clubId", clubId)
            .queryParam("active", true)
            .build()
            .toUriString();

        ResponseEntity<TeamInternalResponse[]> response = internalApiClient.get(url, TeamInternalResponse[].class);
        TeamInternalResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Caching(put = {
        @CachePut(value = "teamById", key = "#id")
    }, evict = {
        @CacheEvict(value = "teamsByClubId", key = "#result.clubId", condition = "#result != null")
    })
    public TeamInternalResponse updateTeam(Long id, UpdateTeamRequest dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<TeamInternalResponse> response = internalApiClient.putMultipart(url, body, TeamInternalResponse.class);
        return response.getBody();
    }
}
