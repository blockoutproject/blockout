package com.blockout.notifications.services.clients;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.team.TeamDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private static final Logger logger = LoggerFactory.getLogger(TeamClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public TeamDTO getTeamById(Long id) {
        String url = apiClientProperties.getTeam().getUrl() + "/" + id;

        logger.info("Calling getTeamById", keyValue("id", id), keyValue("url", url));

        ResponseEntity<TeamDTO> response = apiClientService.getService(url, TeamDTO.class);
        return response.getBody();
    }
}