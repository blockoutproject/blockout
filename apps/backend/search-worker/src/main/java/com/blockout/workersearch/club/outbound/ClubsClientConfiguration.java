package com.blockout.workersearch.club.outbound;

import com.blockout.workersearch.clubsclient.api.ClubsClient;
import com.blockout.workersearch.clubsclient.invoker.ApiClient;
import com.blockout.workersearch.config.ApiClientProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ClubsClientConfiguration {

    @Bean
    ClubsClient clubsClient(RestTemplate authenticatedRestTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(authenticatedRestTemplate)
                .setBasePath(ClubsServiceUrl.canonicalBasePath(properties.getClub().getUrl()));
        return new ClubsClient(apiClient);
    }
}
