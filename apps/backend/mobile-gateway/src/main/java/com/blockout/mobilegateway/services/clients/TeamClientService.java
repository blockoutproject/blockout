package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamUpdateDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
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

import java.util.*;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getTeam().getUrl();
    }

    @Cacheable(value = "teamById", key = "#id")
    public TeamDTO getTeamById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        ResponseEntity<TeamDTO> response = apiClientService.get(url, TeamDTO.class);
        return response.getBody();
    }

    public List<TeamDTO> getTeamsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("ids", ids)
                .queryParam("active", true)
                .build()
                .toUriString();

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Cacheable(value = "teamsByClubId", key = "#clubId")
    public List<TeamDTO> getTeamsByClubId(String clubId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("clubId", clubId)
                .queryParam("active", true)
                .build()
                .toUriString();

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Caching(put = {
            @CachePut(value = "teamById", key = "#id")
    }, evict = {
            @CacheEvict(value = "teamsByClubId", key = "#result.clubId", condition = "#result != null")
    })
    public TeamDTO updateTeam(Long id, TeamUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<TeamDTO> response = apiClientService.putMultipart(url, body, TeamDTO.class);
        return response.getBody();
    }
}