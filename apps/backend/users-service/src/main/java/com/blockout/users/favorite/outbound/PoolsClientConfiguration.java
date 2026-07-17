package com.blockout.users.favorite.outbound;

import com.blockout.users.config.ApiClientProperties;
import com.blockout.users.poolsclient.api.PoolFollowersClient;
import com.blockout.users.poolsclient.invoker.ApiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class PoolsClientConfiguration {

    @Bean
    PoolFollowersClient poolFollowersClient(RestTemplate forwardRestTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(forwardRestTemplate)
                .setBasePath(PoolsServiceUrl.canonicalBasePath(properties.getPool().getUrl()));
        return new PoolFollowersClient(apiClient);
    }
}
