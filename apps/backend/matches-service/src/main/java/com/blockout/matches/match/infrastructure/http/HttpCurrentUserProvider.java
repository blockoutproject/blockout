package com.blockout.matches.match.infrastructure.http;

import com.blockout.matches.config.ApiClientProperties;
import com.blockout.matches.match.application.ports.CurrentUserProvider;
import com.blockout.matches.match.application.views.CurrentUserView;
import com.blockout.matches.match.infrastructure.http.models.UserInternalResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class HttpCurrentUserProvider implements CurrentUserProvider {

    private final ApiClientProperties properties;
    private final RestTemplate restTemplate;

    public HttpCurrentUserProvider(
        ApiClientProperties properties,
        @Qualifier("forwardRestTemplate") RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    @Override
    public CurrentUserView getCurrentUser() {
        String url = properties.getUser().getUrl() + "/me";
        ResponseEntity<UserInternalResponse> response = restTemplate.exchange(
            url, HttpMethod.GET, null, UserInternalResponse.class);
        UserInternalResponse user = response.getBody();
        return user == null ? null : new CurrentUserView(user.id(), user.auth0Id(), user.createdAt());
    }
}
