package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private static final Logger logger = LoggerFactory.getLogger(TeamClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<TeamDTO> getTeamsByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder
                .fromUriString(apiClientProperties.getTeam().getUrl())
                .queryParam("ids", ids)
                .build()
                .toUriString();

        logger.info("Calling getTeamsByIds", keyValue("ids", ids), keyValue("url", url));

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public TeamDTO getTeamById(Long id) {
        String url = apiClientProperties.getTeam().getUrl() + "/" + id;

        logger.info("Calling getTeamById", keyValue("id", id), keyValue("url", url));

        ResponseEntity<TeamDTO> response = apiClientService.get(url, TeamDTO.class);
        return response.getBody();
    }   

    public List<TeamDTO> getTeamsByClubId(String clubId) {
        String url = UriComponentsBuilder
                .fromUriString(apiClientProperties.getTeam().getUrl())
                .queryParam("clubId", clubId)
                .build()
                .toUriString();

        logger.info("Calling getTeamsByClubId", keyValue("clubId", clubId), keyValue("url", url));

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}