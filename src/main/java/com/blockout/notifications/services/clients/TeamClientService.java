package com.blockout.notifications.services.clients;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.team.TeamDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeamClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public TeamDTO getTeamById(Long id) {
        String url = apiClientProperties.getTeam().getUrl() + "/" + id;

        ResponseEntity<TeamDTO> response = apiClientService.getService(url, TeamDTO.class);
        return response.getBody();
    }
}