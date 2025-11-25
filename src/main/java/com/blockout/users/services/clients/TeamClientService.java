package com.blockout.users.services.clients;

import com.blockout.users.config.ApiClientProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

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

    public void incrementFollowers(Long teamId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(teamId), "followers", "increment")
                .queryParam("user_id", userId)
                .build()
                .toUriString();

        logger.info("Calling team#increment_followers",
                keyValue("action", "call_team_increment_followers"),
                keyValue("teamId", teamId),
                keyValue("userId", userId),
                keyValue("url", url));

        ResponseEntity<Void> response =
                apiClientService.post(url, Collections.emptyMap(), Void.class);

        logger.info("Team followers incremented",
                keyValue("action", "call_team_increment_followers"),
                keyValue("status", response.getStatusCode()),
                keyValue("teamId", teamId),
                keyValue("userId", userId));
    }

    public void decrementFollowers(Long teamId, Long userId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(String.valueOf(teamId), "followers", "decrement")
                .queryParam("user_id", userId)
                .build()
                .toUriString();

        logger.info("Calling team#decrement_followers",
                keyValue("action", "call_team_decrement_followers"),
                keyValue("teamId", teamId),
                keyValue("userId", userId),
                keyValue("url", url));

        ResponseEntity<Void> response =
                apiClientService.post(url, Collections.emptyMap(), Void.class);

        logger.info("Team followers decremented",
                keyValue("action", "call_team_decrement_followers"),
                keyValue("status", response.getStatusCode()),
                keyValue("teamId", teamId),
                keyValue("userId", userId));
    }
}