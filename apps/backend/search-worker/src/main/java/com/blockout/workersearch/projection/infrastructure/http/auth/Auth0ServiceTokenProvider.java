package com.blockout.workersearch.projection.infrastructure.http.auth;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.auth0.client.auth.AuthAPI;
import com.blockout.workersearch.config.Auth0Properties;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class Auth0ServiceTokenProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(Auth0ServiceTokenProvider.class);

    private final Auth0Properties auth0Properties;

    private volatile String accessToken = "";
    private volatile LocalDateTime tokenExpiry = LocalDateTime.MAX;

    @PostConstruct
    public void initialize() {
        try {
            refreshToken();
        } catch (Exception exception) {
            LOGGER.error("Failed to initialize Auth0 token", keyValue("action", "init_token_failed"), exception);
            throw new IllegalStateException("Unable to initialize Auth0 token", exception);
        }
    }

    @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
    public void refreshToken() {
        try {
            var auth = AuthAPI.newBuilder(
                            auth0Properties.getDomain(),
                            auth0Properties.getClientId(),
                            auth0Properties.getClientSecret())
                    .build();
            var holder = auth.requestToken(auth0Properties.getAudience()).execute().getBody();
            accessToken = holder.getAccessToken();
            tokenExpiry = LocalDateTime.now().plusSeconds(holder.getExpiresIn());
            LOGGER.info(
                    "Auth0 token refreshed",
                    keyValue("action", "refresh_token_success"),
                    keyValue("expires_at", tokenExpiry));
        } catch (Exception exception) {
            LOGGER.error("Error refreshing Auth0 token", keyValue("action", "refresh_token_error"), exception);
        }
    }

    public String getAccessToken() {
        return accessToken == null ? "" : accessToken;
    }

}
