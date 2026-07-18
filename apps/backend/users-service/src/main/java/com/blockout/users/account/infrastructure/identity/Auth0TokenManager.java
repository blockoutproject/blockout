package com.blockout.users.account.infrastructure.identity;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.auth0.client.auth.AuthAPI;
import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.json.auth.TokenHolder;
import com.auth0.net.TokenRequest;
import com.blockout.users.config.Auth0Properties;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Owns the Auth0 Management API token and client lifecycle inside the identity adapter. */
@Service
@RequiredArgsConstructor
public class Auth0TokenManager {

    private static final Logger LOGGER = LoggerFactory.getLogger(Auth0TokenManager.class);

    private final Auth0Properties properties;
    private volatile ManagementAPI managementAPI;
    private volatile LocalDateTime tokenExpiry;

    /** Preserves the retained startup attempt and failure behavior. */
    @PostConstruct
    public void init() {
        try {
            LOGGER.info("Initializing Auth0 token manager for Management API",
                    keyValue("action", "init_management_token"),
                    keyValue("auth0.domain", properties.getDomain()));
            refreshToken();
        } catch (Exception exception) {
            LOGGER.error("Failed to initialize Auth0 Management token",
                    keyValue("action", "init_management_token_failed"),
                    keyValue("auth0.domain", properties.getDomain()),
                    exception);
            throw new RuntimeException("Unable to initialize Auth0 Management token", exception);
        }
    }

    /** Preserves the configured fixed-delay token refresh and swallowed refresh failures. */
    @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
    public void refreshToken() {
        LOGGER.info("Refreshing Auth0 Management token", keyValue("action", "refresh_management_token"));

        try {
            AuthAPI auth = AuthAPI.newBuilder(
                    properties.getDomain(), properties.getClientId(), properties.getClientSecret()).build();
            TokenRequest tokenRequest = auth.requestToken(properties.getAudience());
            TokenHolder holder = tokenRequest.execute().getBody();

            String accessToken = holder.getAccessToken();
            tokenExpiry = LocalDateTime.now().plusSeconds(holder.getExpiresIn());
            managementAPI = ManagementAPI.newBuilder(properties.getDomain(), accessToken).build();

            LOGGER.info("Auth0 Management token refreshed successfully",
                    keyValue("action", "refresh_management_token_success"),
                    keyValue("expires_at", tokenExpiry));
        } catch (Exception exception) {
            LOGGER.error("Error refreshing Auth0 Management token",
                    keyValue("action", "refresh_management_token_error"), exception);
        }
    }

    public ManagementAPI getManagementAPI() {
        return managementAPI;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }
}
