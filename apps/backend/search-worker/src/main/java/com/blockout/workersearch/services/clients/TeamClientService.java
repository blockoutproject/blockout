package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.team.TeamDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<TeamDTO> listActiveTeams() {
        String baseUrl = apiClientProperties.getTeam().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("active", true)
                .build()
                .toUriString();

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

        ResponseEntity<TeamDTO[]> response = apiClientService.get(url, TeamDTO[].class);
        TeamDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}