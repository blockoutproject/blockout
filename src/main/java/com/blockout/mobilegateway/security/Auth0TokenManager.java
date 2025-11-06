package com.blockout.mobilegateway.security;

import com.auth0.client.auth.AuthAPI;
import com.auth0.json.auth.TokenHolder;
import com.auth0.net.TokenRequest;
import com.blockout.mobilegateway.config.Auth0Properties;
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

    private final Auth0Properties auth0Properties;

    private volatile String accessToken;
    private volatile LocalDateTime tokenExpiry;

    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing Auth0 token manager",
                keyValue("action", "init_token_manager"),
                keyValue("audience", auth0Properties.getAudience()),
                keyValue("domain", auth0Properties.getDomain()));
            refreshToken();
        } catch (Exception e) {
            logger.error("Failed to initialize Auth0 token",
                keyValue("action", "init_token_failed"),
                keyValue("domain", auth0Properties.getDomain()),
                keyValue("audience", auth0Properties.getAudience()),
                e);
            throw new RuntimeException("Unable to initialize Auth0 token", e);
        }
    }

    @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
    public void refreshToken() {
        logger.info("Refreshing Auth0 token",
            keyValue("action", "refresh_token_start"),
            keyValue("audience", auth0Properties.getAudience()));

        try {
            AuthAPI auth = AuthAPI.newBuilder(
                auth0Properties.getDomain(),
                auth0Properties.getClientId(),
                auth0Properties.getClientSecret()
            ).build();

            TokenRequest tr = auth.requestToken(auth0Properties.getAudience());
            TokenHolder holder = tr.execute().getBody();

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

    /** Retourne le token courant (peut être null brièvement si init échoue). */
    public String getAccessToken() {
        return accessToken;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }
}