package com.blockout.users.config;

import com.auth0.client.auth.AuthAPI;
import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.json.auth.TokenHolder;
import com.auth0.net.TokenRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class Auth0TokenManager {

    private static final Logger logger = LoggerFactory.getLogger(Auth0TokenManager.class);
    private final Auth0Properties properties;
    private volatile ManagementAPI managementAPI;
    private volatile LocalDateTime tokenExpiry;

    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing Auth0 token manager for Management API",
                    keyValue("action", "init_management_token"),
                    keyValue("auth0.domain", properties.getDomain()));
            refreshToken();
        } catch (Exception e) {
            logger.error("Failed to initialize Auth0 Management token",
                    keyValue("action", "init_management_token_failed"),
                    keyValue("auth0.domain", properties.getDomain()),
                    e);
            throw new RuntimeException("Unable to initialize Auth0 Management token", e);
        }
    }

    @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
    public void refreshToken() {
        logger.info("Refreshing Auth0 Management token",
                keyValue("action", "refresh_management_token"));

        try {
            AuthAPI auth = AuthAPI.newBuilder(
                    properties.getDomain(),
                    properties.getClientId(),
                    properties.getClientSecret()).build();

            TokenRequest tokenRequest = auth.requestToken(properties.getAudience());
            TokenHolder holder = tokenRequest.execute().getBody();

            String accessToken = holder.getAccessToken();
            this.tokenExpiry = LocalDateTime.now().plusSeconds(holder.getExpiresIn());
            this.managementAPI = ManagementAPI.newBuilder(properties.getDomain(), accessToken).build();

            logger.info("Auth0 Management token refreshed successfully",
                    keyValue("action", "refresh_management_token_success"),
                    keyValue("expires_at", tokenExpiry));
        } catch (Exception e) {
            logger.error("Error refreshing Auth0 Management token",
                    keyValue("action", "refresh_management_token_error"),
                    e);
        }
    }

    public ManagementAPI getManagementAPI() {
        return managementAPI;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }
}