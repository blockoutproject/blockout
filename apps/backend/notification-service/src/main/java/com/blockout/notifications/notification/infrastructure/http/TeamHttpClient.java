package com.blockout.notifications.notification.infrastructure.http;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.notification.infrastructure.http.models.TeamInternalResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeamHttpClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient apiClientService;

    public TeamInternalResponse getTeamById(Long id) {
        String url = apiClientProperties.getTeam().getUrl() + "/" + id;

        ResponseEntity<TeamInternalResponse> response = apiClientService.getService(url, TeamInternalResponse.class);
        return response.getBody();
    }
}
