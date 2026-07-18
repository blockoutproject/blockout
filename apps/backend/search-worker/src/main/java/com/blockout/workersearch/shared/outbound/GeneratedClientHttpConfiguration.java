package com.blockout.workersearch.shared.outbound;

import com.blockout.workersearch.shared.outbound.auth.ServiceAccessToken;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;

@Configuration
@RequiredArgsConstructor
public class GeneratedClientHttpConfiguration {

    private final ServiceAccessToken serviceAccessToken;

    @Bean
    public RestTemplate authenticatedRestTemplate(RestTemplateBuilder builder) {
        ClientHttpRequestInterceptor bearer = (request, body, execution) -> {
            String token = serviceAccessToken.getAccessToken();
            if (token != null && !token.isBlank()) {
                request.getHeaders().setBearerAuth(token);
            }
            return execution.execute(request, body);
        };

        return builder
                .additionalInterceptors(bearer)
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(15))
                .build();
    }
}
