package com.blockout.workersearch.team.outbound;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.teamsclient.api.TeamsClient;
import com.blockout.workersearch.teamsclient.invoker.ApiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class TeamsClientConfiguration {

    @Bean
    TeamsClient teamsClient(RestTemplate authenticatedRestTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(authenticatedRestTemplate)
                .setBasePath(TeamsServiceUrl.canonicalBasePath(properties.getTeam().getUrl()));
        return new TeamsClient(apiClient);
    }
}
