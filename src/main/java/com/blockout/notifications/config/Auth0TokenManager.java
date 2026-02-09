package com.blockout.notifications.config;

import com.auth0.client.auth.AuthAPI;
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

    private static final boolean M2M_ENABLED = false;

    private final Auth0Properties auth0Properties;

    private volatile String accessToken = "";
    private volatile LocalDateTime tokenExpiry = LocalDateTime.MAX;

    @PostConstruct
    public void init() {
        if (!M2M_ENABLED) {
            logger.warn("Auth0 M2M bypass enabled",
                    keyValue("action", "auth0_bypass_enabled"));
            return;
        }

        try {
            refreshToken();
        } catch (Exception e) {
            logger.error("Failed to initialize Auth0 token",
                    keyValue("action", "init_token_failed"),
                    e);
            throw new RuntimeException("Unable to initialize Auth0 token", e);
        }
    }

    @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
    public void refreshToken() {

        if (!M2M_ENABLED) {
            return;
        }

        try {
            AuthAPI auth = AuthAPI.newBuilder(
                    auth0Properties.getDomain(),
                    auth0Properties.getClientId(),
                    auth0Properties.getClientSecret()
            ).build();

            TokenRequest tokenRequest = auth.requestToken(auth0Properties.getAudience());
            TokenHolder holder = tokenRequest.execute().getBody();

            this.accessToken = holder.getAccessToken();
            this.tokenExpiry = LocalDateTime.now().plusSeconds(holder.getExpiresIn());

            logger.info("Auth0 token refreshed",
                    keyValue("action", "refresh_token_success"),
                    keyValue("expires_at", tokenExpiry));

        } catch (Exception e) {
            logger.error("Error refreshing Auth0 token",
                    keyValue("action", "refresh_token_error"),
                    e);
        }
    }

    public String getAccessToken() {
        return accessToken == null ? "" : accessToken;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }
}