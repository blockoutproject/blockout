package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.exceptions.TeamNotFoundException;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
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
        if (ids.isEmpty())
            return Collections.emptyList();

        String teamApiUrl = apiClientProperties.getTeam().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(teamApiUrl)
                .queryParam("ids", ids)
                .build()
                .toUriString();

        logger.info("Calling getTeamsByIds", keyValue("ids", ids), keyValue("url", url));

        try {
            ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
            return response.getBody() != null ? Arrays.asList(response.getBody()) : Collections.emptyList();
        } catch (Exception e) {
            logger.error("Failed to fetch teams", keyValue("url", url), keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération des équipes", e);
        }
    }

    public TeamDTO getTeamById(Long id) {
        String teamApiUrl = apiClientProperties.getTeam().getUrl();
        String url = teamApiUrl + "/" + id;

        logger.info("Calling getTeamById", keyValue("id", id), keyValue("url", url));

        try {
            ResponseEntity<TeamDTO> response = apiClientService.get(url, TeamDTO.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            logger.warn("Team not found", keyValue("teamId", id));
            throw new TeamNotFoundException(id);
        } catch (Exception e) {
            logger.error("Failed to fetch team",
                    keyValue("id", id),
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération de l'équipe", e);
        }
    }
}