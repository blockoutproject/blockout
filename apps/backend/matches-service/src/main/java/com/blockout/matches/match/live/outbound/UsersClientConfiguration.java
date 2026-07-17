package com.blockout.matches.match.live.outbound;

import com.blockout.matches.config.ApiClientProperties;
import com.blockout.matches.usersclient.api.UserAccountsClient;
import com.blockout.matches.usersclient.invoker.ApiClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class UsersClientConfiguration {

    @Bean
    UserAccountsClient userAccountsClient(
            @Qualifier("forwardRestTemplate") RestTemplate forwardRestTemplate,
            ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(forwardRestTemplate)
                .setBasePath(UsersServiceUrl.canonicalBasePath(properties.getUser().getUrl()));
        return new UserAccountsClient(apiClient);
    }
}
