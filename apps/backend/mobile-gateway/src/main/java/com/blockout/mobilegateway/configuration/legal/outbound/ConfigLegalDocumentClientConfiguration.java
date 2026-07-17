package com.blockout.mobilegateway.configuration.legal.outbound;

import com.blockout.config.client.api.LegalDocumentsClient;
import com.blockout.config.client.invoker.ApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ConfigLegalDocumentClientConfiguration {

    @Bean
    @Qualifier("configLegalDocumentsUserClient")
    public LegalDocumentsClient configLegalDocumentsUserClient(
            @Qualifier("internalAuthRestTemplate") RestTemplate restTemplate,
            ApiClientProperties properties) {
        return client(restTemplate, properties);
    }

    @Bean
    @Qualifier("configLegalDocumentsM2mClient")
    public LegalDocumentsClient configLegalDocumentsM2mClient(
            @Qualifier("internalM2MRestTemplate") RestTemplate restTemplate,
            ApiClientProperties properties) {
        return client(restTemplate, properties);
    }

    private LegalDocumentsClient client(RestTemplate restTemplate, ApiClientProperties properties) {
        ApiClient apiClient = new ApiClient(restTemplate)
                .setBasePath(ConfigServiceUrl.canonicalBasePath(properties.getConfig().getUrl()));
        return new LegalDocumentsClient(apiClient);
    }
}
