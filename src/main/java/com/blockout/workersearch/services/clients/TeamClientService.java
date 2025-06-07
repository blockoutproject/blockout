package com.blockout.workersearch.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.team.TeamDTO;

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

    public List<TeamDTO> listAllTeams() {
        String url = apiClientProperties.getTeam().getUrl();
        logger.info("Calling listAllTeams endpoint",
                keyValue("action", "call_team_list_all"),
                keyValue("url", url));

        try {
            ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
            TeamDTO[] body = response.getBody();
            List<TeamDTO> teams = body != null ? Arrays.asList(body) : Collections.emptyList();

            logger.info("Successfully fetched all teams",
                    keyValue("count", teams.size()));

            return teams;
        } catch (Exception e) {
            logger.error("Failed to fetch all teams from Team API",
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            return Collections.emptyList();
        }
    }

    public List<TeamDTO> listTeamsByClubId(String clubId) {
        String teamApiUrl = apiClientProperties.getTeam().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(teamApiUrl)
                .queryParam("club_id", clubId)
                .build()
                .toUriString();

        logger.info("Calling listTeamsByClubId endpoint",
                keyValue("action", "call_team_list_by_club"),
                keyValue("url", url),
                keyValue("clubId", clubId));

        try {
            ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
            TeamDTO[] body = response.getBody();
            List<TeamDTO> teams = body != null ? Arrays.asList(body) : Collections.emptyList();

            logger.info("Successfully fetched teams by clubId",
                    keyValue("count", teams.size()));

            return teams;
        } catch (Exception e) {
            logger.error("Failed to fetch teams from Team API",
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            return Collections.emptyList();
        }
    }
}