package com.blockout.mobilegateway.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class RestTemplateConfig {

    private final FfvbProxyProperties proxyProperties;

    /**
     * RestTemplate INTERNE (APIs Blockout, etc.) → ajoute automatiquement le
     * Bearer.
     */
    @Bean
    @Qualifier("internalRestTemplate")
    public RestTemplate internalRestTemplate(RestTemplateBuilder builder) {
        return builder
                .additionalInterceptors(bearerTokenInterceptor())
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(15))
                .build();
    }

    /**
     * RestTemplate EXTERNE (FFVB) → aucun Bearer, juste un User-Agent + timeouts.
     */
    @Bean
    @Qualifier("externalRestTemplate")
    public RestTemplate externalRestTemplate(RestTemplateBuilder builder) {
        Proxy proxy = new Proxy(
                Proxy.Type.HTTP,
                new InetSocketAddress(proxyProperties.getHost(), proxyProperties.getPort()));

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setProxy(proxy);

        return builder
                .requestFactory(() -> requestFactory)
                .additionalInterceptors(userAgentInterceptor("Blockout-MobileGateway/1.0"))
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(15))
                .build();
    }

    @Bean
    public ClientHttpRequestInterceptor bearerTokenInterceptor() {
        return (request, body, execution) -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                request.getHeaders().setBearerAuth(jwtAuth.getToken().getTokenValue());
            }
            return execution.execute(request, body);
        };
    }

    private ClientHttpRequestInterceptor userAgentInterceptor(String ua) {
        return (request, body, execution) -> {
            if (!request.getHeaders().containsKey("User-Agent")) {
                request.getHeaders().add("User-Agent", ua);
            }
            return execution.execute(request, body);
        };
    }
}