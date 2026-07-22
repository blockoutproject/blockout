package com.blockout.notifications.notification.infrastructure.http;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.notification.application.views.TeamNotificationView;
import com.blockout.notifications.notification.infrastructure.http.contract.team.models.TeamInternalResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/** Reads team notification data from the authoritative internal Team API. */
@Service
@RequiredArgsConstructor
public class TeamHttpClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient apiClientService;

    /**
     * Reads the team display data needed by notification composition.
     *
     * @param id team identifier.
     * @return notification projection, or {@code null} when the downstream response has no body.
     */
    public TeamNotificationView getTeamById(Long id) {
        String url = apiClientProperties.getTeam().getUrl() + "/" + id;

        ResponseEntity<TeamInternalResponse> response = apiClientService.getService(url, TeamInternalResponse.class);
        TeamInternalResponse team = response.getBody();
        return team == null ? null : new TeamNotificationView(team.getShortName());
    }
}
