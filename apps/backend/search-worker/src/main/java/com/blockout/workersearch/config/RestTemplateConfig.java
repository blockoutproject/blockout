package com.blockout.workersearch.config;

import com.blockout.workersearch.projection.infrastructure.http.auth.Auth0ServiceTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;

@Configuration
public class RestTemplateConfig {

    private final Auth0ServiceTokenProvider tokenProvider;

    public RestTemplateConfig(Auth0ServiceTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Bean
    public RestTemplate authenticatedRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        ClientHttpRequestInterceptor interceptor = (request, body, execution) -> {
            String token = tokenProvider.getAccessToken();
            if (token != null && !token.isBlank()) {
                request.getHeaders().setBearerAuth(token);
            }
            return execution.execute(request, body);
        };

        restTemplate.setInterceptors(Collections.singletonList(interceptor));
        return restTemplate;
    }
}
