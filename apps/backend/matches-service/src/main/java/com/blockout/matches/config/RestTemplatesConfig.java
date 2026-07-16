package com.blockout.matches.config;

import java.time.Duration;
import java.util.List;

import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplatesConfig {

    private static final int CONNECT_TIMEOUT_MS = (int) Duration.ofSeconds(3).toMillis();
    private static final int READ_TIMEOUT_MS = (int) Duration.ofSeconds(10).toMillis();

    private HttpComponentsClientHttpRequestFactory requestFactory() {
        PoolingHttpClientConnectionManager connManager = new PoolingHttpClientConnectionManager();
        connManager.setDefaultConnectionConfig(
                ConnectionConfig.custom()
                        .setConnectTimeout(Timeout.ofMilliseconds(CONNECT_TIMEOUT_MS))
                        .setSocketTimeout(Timeout.ofMilliseconds(READ_TIMEOUT_MS))
                        .build());

        RequestConfig rc = RequestConfig.custom()
                .setResponseTimeout(Timeout.ofMilliseconds(READ_TIMEOUT_MS))
                .build();

        CloseableHttpClient http = HttpClientBuilder.create()
                .setConnectionManager(connManager)
                .setDefaultRequestConfig(rc)
                .evictExpiredConnections()
                .evictIdleConnections(Timeout.ofSeconds(30))
                .build();

        return new HttpComponentsClientHttpRequestFactory(http);
    }

    /** RestTemplate qui FORWARDE le token de l'utilisateur courant. */
    @Bean
    @Qualifier("forwardRestTemplate")
    public RestTemplate forwardRestTemplate() {
        RestTemplate rt = new RestTemplate(requestFactory());
        ClientHttpRequestInterceptor forward = (req, body, exec) -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwt) {
                req.getHeaders().setBearerAuth(jwt.getToken().getTokenValue());
            } else {
                // Par sécurité: si on attend un contexte user et qu'il n'y en a pas, on échoue.
                throw new IllegalStateException("No JwtAuthenticationToken in SecurityContext for forwarded call");
            }
            return exec.execute(req, body);
        };
        rt.setInterceptors(List.of(forward));
        return rt;
    }
}