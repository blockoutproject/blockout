package com.blockout.mobilegateway.shared.outbound;

import com.blockout.config.client.api.AppStatusClient;
import com.blockout.config.client.api.DivisionsClient;
import com.blockout.config.client.api.RawDivisionMappingsClient;
import com.blockout.config.client.api.ScraperStatusesClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.notificationclient.api.NotificationInboxMutationsClient;
import com.blockout.mobilegateway.notificationclient.api.NotificationInboxPagesClient;
import com.blockout.mobilegateway.notificationclient.api.NotificationPushTokensClient;
import com.blockout.mobilegateway.reportsclient.api.ReportsClient;
import com.blockout.mobilegateway.searchclient.api.SearchClient;
import com.blockout.mobilegateway.usersclient.api.UserAccountsClient;
import com.blockout.mobilegateway.usersclient.api.UserFavoritesClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/** Creates generated clients over the existing user-forwarding and M2M transports. */
@Configuration
public class GeneratedDownstreamClientConfiguration {

    @Bean("configAppStatusUserClient")
    AppStatusClient configAppStatusUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new AppStatusClient(configClient(transport, properties));
    }

    @Bean("configAppStatusM2mClient")
    AppStatusClient configAppStatusM2mClient(
            @Qualifier("internalM2MRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new AppStatusClient(configClient(transport, properties));
    }

    @Bean("configDivisionsUserClient")
    DivisionsClient configDivisionsUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new DivisionsClient(configClient(transport, properties));
    }

    @Bean("configDivisionsM2mClient")
    DivisionsClient configDivisionsM2mClient(
            @Qualifier("internalM2MRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new DivisionsClient(configClient(transport, properties));
    }

    @Bean("configRawMappingsUserClient")
    RawDivisionMappingsClient configRawMappingsUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new RawDivisionMappingsClient(configClient(transport, properties));
    }

    @Bean("configScraperStatusesUserClient")
    ScraperStatusesClient configScraperStatusesUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new ScraperStatusesClient(configClient(transport, properties));
    }

    @Bean("usersAccountsUserClient")
    UserAccountsClient usersAccountsUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new UserAccountsClient(usersClient(transport, properties));
    }

    @Bean("usersFavoritesUserClient")
    UserFavoritesClient usersFavoritesUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new UserFavoritesClient(usersClient(transport, properties));
    }

    @Bean("reportsUserClient")
    ReportsClient reportsUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new ReportsClient(reportsClient(transport, properties));
    }

    @Bean("reportsM2mClient")
    ReportsClient reportsM2mClient(
            @Qualifier("internalM2MRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new ReportsClient(reportsClient(transport, properties));
    }

    @Bean("searchUserClient")
    SearchClient searchUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new SearchClient(searchClient(transport, properties));
    }

    @Bean("searchM2mClient")
    SearchClient searchM2mClient(
            @Qualifier("internalM2MRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new SearchClient(searchClient(transport, properties));
    }

    @Bean
    NotificationInboxPagesClient notificationInboxPagesClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new NotificationInboxPagesClient(notificationClient(transport, properties));
    }

    @Bean
    NotificationInboxMutationsClient notificationInboxMutationsClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new NotificationInboxMutationsClient(notificationClient(transport, properties));
    }

    @Bean
    NotificationPushTokensClient notificationPushTokensClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate transport, ApiClientProperties properties) {
        return new NotificationPushTokensClient(notificationClient(transport, properties));
    }

    private com.blockout.config.client.invoker.ApiClient configClient(
            RestTemplate transport, ApiClientProperties properties) {
        return new com.blockout.config.client.invoker.ApiClient(transport)
                .setBasePath(DownstreamClientSupport.canonicalRoot(properties.getConfig().getUrl()));
    }

    private com.blockout.mobilegateway.usersclient.invoker.ApiClient usersClient(
            RestTemplate transport, ApiClientProperties properties) {
        return new com.blockout.mobilegateway.usersclient.invoker.ApiClient(transport)
                .setBasePath(DownstreamClientSupport.canonicalRoot(properties.getUser().getUrl()));
    }

    private com.blockout.mobilegateway.reportsclient.invoker.ApiClient reportsClient(
            RestTemplate transport, ApiClientProperties properties) {
        return new com.blockout.mobilegateway.reportsclient.invoker.ApiClient(transport)
                .setBasePath(DownstreamClientSupport.canonicalRoot(properties.getReport().getUrl()));
    }

    private com.blockout.mobilegateway.searchclient.invoker.ApiClient searchClient(
            RestTemplate transport, ApiClientProperties properties) {
        return new com.blockout.mobilegateway.searchclient.invoker.ApiClient(transport)
                .setBasePath(DownstreamClientSupport.canonicalRoot(properties.getSearch().getUrl()));
    }

    private com.blockout.mobilegateway.notificationclient.invoker.ApiClient notificationClient(
            RestTemplate transport, ApiClientProperties properties) {
        return new com.blockout.mobilegateway.notificationclient.invoker.ApiClient(transport)
                .setBasePath(DownstreamClientSupport.canonicalRoot(properties.getNotification().getUrl()));
    }
}
