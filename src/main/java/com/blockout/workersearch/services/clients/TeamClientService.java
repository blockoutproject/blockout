package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.team.TeamDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private static final Logger logger = LoggerFactory.getLogger(TeamClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<TeamDTO> listActiveTeams() {
        String baseUrl = apiClientProperties.getTeam().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("active", true)
                .build()
                .toUriString();

        logger.info("Calling listAllTeams endpoint",
                keyValue("action", "call_team_list_active"),
                keyValue("url", url));

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<TeamDTO> listTeamsByClubId(String clubId) {
        String baseUrl = apiClientProperties.getTeam().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("club_id", clubId)
                .build()
                .toUriString();

        logger.info("Calling listTeamsByClubId endpoint",
                keyValue("action", "call_team_list_by_club"),
                keyValue("url", url),
                keyValue("clubId", clubId));

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}