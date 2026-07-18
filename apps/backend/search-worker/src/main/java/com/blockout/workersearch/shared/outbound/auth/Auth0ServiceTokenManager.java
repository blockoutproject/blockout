package com.blockout.workersearch.shared.outbound.auth;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class Auth0ServiceTokenManager implements ServiceAccessToken {

    private static final Logger logger = LoggerFactory.getLogger(Auth0ServiceTokenManager.class);

    private final ServiceTokenProvider tokenProvider;

    private volatile String accessToken = "";
    private volatile LocalDateTime tokenExpiry = LocalDateTime.MIN;

    @PostConstruct
    public void initialize() {
        try {
            replaceToken();
        } catch (Exception exception) {
            logger.error("Failed to initialize Auth0 token", keyValue("action", "init_token_failed"), exception);
            throw new IllegalStateException("Unable to initialize Auth0 token", exception);
        }
    }

    @Scheduled(fixedDelayString = "#{@auth0Properties.tokenRefreshDelay.toMillis()}")
    public void refresh() {
        try {
            replaceToken();
        } catch (Exception exception) {
            logger.error(
                    "Error refreshing Auth0 token",
                    keyValue("action", "refresh_token_error"),
                    keyValue("retained_expires_at", tokenExpiry),
                    exception);
        }
    }

    @Override
    public String getAccessToken() {
        return accessToken;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }

    private void replaceToken() throws Exception {
        ServiceTokenLease lease = tokenProvider.acquire();
        LocalDateTime expiry = LocalDateTime.now().plusSeconds(lease.expiresInSeconds());
        accessToken = lease.accessToken();
        tokenExpiry = expiry;
        logger.info(
                "Auth0 token refreshed",
                keyValue("action", "refresh_token_success"),
                keyValue("expires_at", expiry));
    }
}
