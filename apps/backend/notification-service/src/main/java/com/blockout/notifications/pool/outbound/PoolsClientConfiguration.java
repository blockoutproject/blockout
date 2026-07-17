package com.blockout.notifications.pool.outbound;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.poolsclient.api.PoolsClient;
import com.blockout.notifications.poolsclient.invoker.ApiClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class PoolsClientConfiguration {

    @Bean
    PoolsClient poolsClient(
            @Qualifier("serviceRestTemplate") RestTemplate serviceRestTemplate,
            ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(serviceRestTemplate)
                .setBasePath(PoolsServiceUrl.canonicalBasePath(properties.getPool().getUrl()));
        return new PoolsClient(apiClient);
    }
}
