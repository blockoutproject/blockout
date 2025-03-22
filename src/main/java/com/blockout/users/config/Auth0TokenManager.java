package com.blockout.users.config;

import com.auth0.client.auth.AuthAPI;
import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.json.auth.TokenHolder;
import com.auth0.net.TokenRequest;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class Auth0TokenManager {

    private static final Logger logger = LoggerFactory.getLogger(Auth0TokenManager.class);

    @Value("${auth0.domain}")
    private String domain;

    @Value("${auth0.client-id}")
    private String clientId;

    @Value("${auth0.client-secret}")
    private String clientSecret;

    // Instance volatile pour assurer la visibilité entre threads
    private volatile ManagementAPI managementAPI;
    private volatile LocalDateTime tokenExpiry;

    @PostConstruct
    public void init() throws Exception {
        refreshToken();
    }

    /**
     * Rafraîchit le token Auth0.
     * Ici, nous utilisons @Scheduled pour rafraîchir le token automatiquement toutes les 24 heures.
     * Vous pouvez ajuster la fréquence via la propriété 'auth0.token.refresh.delay' (en millisecondes).
     */
    @Scheduled(fixedDelayString = "${auth0.token.refresh.delay:86400000}")
    public void refreshToken() throws Exception {
        AuthAPI auth = AuthAPI.newBuilder(domain, clientId, clientSecret).build();
        TokenRequest tokenRequest = auth.requestToken("https://" + domain + "/api/v2/");
        TokenHolder holder = tokenRequest.execute().getBody();
        String accessToken = holder.getAccessToken();
        // Calcul de l'expiration à partir du "expires_in" (exprimé en secondes)
        this.tokenExpiry = LocalDateTime.now().plusSeconds(holder.getExpiresIn());
        this.managementAPI = ManagementAPI.newBuilder(domain, accessToken).build();
        logger.info("Token Auth0 rafraîchi, expire à {}", tokenExpiry);
    }

    public ManagementAPI getManagementAPI() {
        return managementAPI;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }
}