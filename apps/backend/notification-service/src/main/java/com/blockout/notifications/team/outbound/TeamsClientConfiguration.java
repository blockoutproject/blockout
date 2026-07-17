package com.blockout.notifications.team.outbound;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.teamsclient.api.TeamsClient;
import com.blockout.notifications.teamsclient.invoker.ApiClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class TeamsClientConfiguration {

    @Bean
    TeamsClient teamsClient(
            @Qualifier("serviceRestTemplate") RestTemplate serviceRestTemplate,
            ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(serviceRestTemplate)
                .setBasePath(TeamsServiceUrl.canonicalBasePath(properties.getTeam().getUrl()));
        return new TeamsClient(apiClient);
    }
}
