package com.blockout.workersearch.pool.outbound;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.poolsclient.api.PoolsClient;
import com.blockout.workersearch.poolsclient.invoker.ApiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class PoolsClientConfiguration {

    @Bean
    PoolsClient poolsClient(RestTemplate authenticatedRestTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(authenticatedRestTemplate)
                .setBasePath(PoolsServiceUrl.canonicalBasePath(properties.getPool().getUrl()));
        return new PoolsClient(apiClient);
    }
}
