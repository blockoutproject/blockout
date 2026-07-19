package com.blockout.notifications.notification.infrastructure.http;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.notification.infrastructure.http.models.UserInternalResponse;

@Service
@RequiredArgsConstructor
public class UserHttpClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient apiClientService;

    public UserInternalResponse getCurrentUser() {
        String url = apiClientProperties.getUser().getUrl() + "/me";

        ResponseEntity<UserInternalResponse> response = apiClientService.getForward(url, UserInternalResponse.class);
        return response.getBody();
    }
}
