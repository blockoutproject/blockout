package com.blockout.notifications.user.outbound;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.usersclient.api.UserAccountsClient;
import com.blockout.notifications.usersclient.invoker.ApiClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class UsersClientConfiguration {

    /** Creates the generated current-user client on the forwarded bearer transport. */
    @Bean
    UserAccountsClient userAccountsClient(
            @Qualifier("forwardRestTemplate") RestTemplate forwardRestTemplate,
            ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(forwardRestTemplate)
                .setBasePath(UsersServiceUrl.canonicalBasePath(properties.getUser().getUrl()));
        return new UserAccountsClient(apiClient);
    }
}
