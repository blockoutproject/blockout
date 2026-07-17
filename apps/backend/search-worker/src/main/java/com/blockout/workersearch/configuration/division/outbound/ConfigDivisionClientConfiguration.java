package com.blockout.workersearch.configuration.division.outbound;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.configclient.api.DivisionsClient;
import com.blockout.workersearch.configclient.invoker.ApiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ConfigDivisionClientConfiguration {

    @Bean
    DivisionsClient configDivisionsClient(RestTemplate authenticatedRestTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(authenticatedRestTemplate)
                .setBasePath(ConfigServiceUrl.canonicalBasePath(properties.getConfig().getUrl()));
        return new DivisionsClient(apiClient);
    }
}
