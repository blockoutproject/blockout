package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamUpdateDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private static final Logger logger = LoggerFactory.getLogger(TeamClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    private String baseUrl() {
        return apiClientProperties.getTeam().getUrl();
    }

    @Cacheable(value = "teamById", key = "#id")
    public TeamDTO getTeamById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        logger.info("Calling team#getById",
                keyValue("action", "call_team_get_by_id"),
                keyValue("id", id),
                keyValue("url", url));

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

        logger.info("Calling team#getByIds",
                keyValue("action", "call_team_get_by_ids"),
                keyValue("ids", ids),
                keyValue("url", url));

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Cacheable(value = "teamsByClubId", key = "#clubId")
    public List<TeamDTO> getTeamsByClubId(String clubId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("club_id", clubId)
                .queryParam("active", true)
                .build()
                .toUriString();

        logger.info("Calling team#getByClubId",
                keyValue("action", "call_team_get_by_club_id"),
                keyValue("clubId", clubId),
                keyValue("url", url));

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Caching(put = {
            @CachePut(value = "teamById", key = "#id")
    }, evict = {
            @CacheEvict(value = "teamsByClubId", key = "#result.clubId", condition = "#result != null")
    })
    public TeamDTO updateTeam(Long id, TeamUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        logger.info("Calling team#update",
                keyValue("action", "call_team_update"),
                keyValue("id", id),
                keyValue("url", url));

        ResponseEntity<TeamDTO> response = apiClientService.put(url, dto, TeamDTO.class);
        return response.getBody();
    }
}