package com.blockout.workersearch.config;

import com.auth0.client.auth.AuthAPI;
import com.auth0.json.auth.TokenHolder;
import com.auth0.net.TokenRequest;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class Auth0TokenManager {

    private static final Logger logger = LoggerFactory.getLogger(Auth0TokenManager.class);

    @Value("${auth0.domain}")
    private String domain;

    @Value("${auth0.client-id}")
    private String clientId;

    @Value("${auth0.client-secret}")
    private String clientSecret;

    @Value("${auth0.audience}")
    private String audience;

    private volatile String accessToken;
    private volatile LocalDateTime tokenExpiry;

    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing Auth0 token manager",
                    keyValue("action", "init_token_manager"));
            refreshToken();
        } catch (Exception e) {
            logger.error("Failed to initialize Auth0 token",
                    keyValue("action", "init_token_failed"),
                    keyValue("auth0.domain", domain),
                    keyValue("auth0.audience", audience),
                    e);
            throw new RuntimeException("Unable to initialize Auth0 token", e);
        }
    }

    @Scheduled(fixedDelayString = "${auth0.token.refresh.delay:86400000}")
    public void refreshToken() {
        logger.info("Refreshing Auth0 token",
                keyValue("action", "refresh_token_start"));

        try {
            AuthAPI auth = AuthAPI.newBuilder(domain, clientId, clientSecret).build();
            TokenRequest tokenRequest = auth.requestToken(audience);
            TokenHolder holder = tokenRequest.execute().getBody();
            this.accessToken = holder.getAccessToken();
            this.tokenExpiry = LocalDateTime.now().plusSeconds(holder.getExpiresIn());

            logger.info("Auth0 token successfully refreshed",
                    keyValue("action", "refresh_token_success"),
                    keyValue("expires_at", tokenExpiry));
        } catch (Exception e) {
            logger.error("Error refreshing Auth0 token",
                    keyValue("action", "refresh_token_error"),
                    e);
        }
    }

    public String getAccessToken() {
        return accessToken;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }
}