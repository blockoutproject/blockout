package com.blockout.mobilegateway.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private static final Logger logger = LoggerFactory.getLogger(TeamClientService.class);

    private final ApiClientService apiClientService;

    @Value("${api.team.url}")
    private String teamApiUrl;

    public List<TeamDTO> getTeamsByIds(Set<Long> ids) {
        if (ids.isEmpty())
            return List.of();

        String url = UriComponentsBuilder
                .fromUriString(teamApiUrl)
                .queryParam("ids", ids)
                .build()
                .toUriString();

        logger.info("Calling getTeamsByIds", keyValue("ids", ids), keyValue("url", url));

        try {
            ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
            return response.getBody() != null ? Arrays.asList(response.getBody()) : List.of();
        } catch (Exception e) {
            logger.error("Failed to fetch teams", keyValue("error", e.getMessage()), e);
            return List.of();
        }
    }
}