package com.blockout.users.favorite.outbound;

import com.blockout.users.config.ApiClientProperties;
import com.blockout.users.teamsclient.api.TeamFollowersClient;
import com.blockout.users.teamsclient.invoker.ApiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class TeamsClientConfiguration {

    @Bean
    TeamFollowersClient teamFollowersClient(RestTemplate forwardRestTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(forwardRestTemplate)
                .setBasePath(TeamsServiceUrl.canonicalBasePath(properties.getTeam().getUrl()));
        return new TeamFollowersClient(apiClient);
    }
}
