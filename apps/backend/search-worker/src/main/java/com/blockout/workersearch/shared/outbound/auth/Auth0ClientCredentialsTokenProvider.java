package com.blockout.workersearch.shared.outbound.auth;

import com.auth0.client.auth.AuthAPI;
import com.auth0.json.auth.TokenHolder;
import com.blockout.workersearch.config.Auth0Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class Auth0ClientCredentialsTokenProvider implements ServiceTokenProvider {

    private final Auth0Properties properties;

    @Override
    public ServiceTokenLease acquire() throws Exception {
        AuthAPI auth = AuthAPI.newBuilder(
                        properties.getDomain(), properties.getClientId(), properties.getClientSecret())
                .build();
        TokenHolder holder = auth.requestToken(properties.getAudience()).execute().getBody();
        if (holder == null || holder.getAccessToken() == null || holder.getAccessToken().isBlank()) {
            throw new IllegalStateException("Auth0 returned no service access token");
        }
        return new ServiceTokenLease(holder.getAccessToken(), holder.getExpiresIn());
    }
}
