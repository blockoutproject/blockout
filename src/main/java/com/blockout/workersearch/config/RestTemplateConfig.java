package com.blockout.workersearch.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;

@Configuration
public class RestTemplateConfig {

    private static final boolean M2M_ENABLED = false;

    private final Auth0TokenManager tokenManager;

    public RestTemplateConfig(Auth0TokenManager tokenManager) {
        this.tokenManager = tokenManager;
    }

    @Bean
    public RestTemplate authenticatedRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        ClientHttpRequestInterceptor interceptor = (request, body, execution) -> {
            if (M2M_ENABLED) {
                String token = tokenManager.getAccessToken();
                if (token != null && !token.isBlank()) {
                    request.getHeaders().setBearerAuth(token);
                }
            }
            return execution.execute(request, body);
        };

        restTemplate.setInterceptors(Collections.singletonList(interceptor));
        return restTemplate;
    }
}