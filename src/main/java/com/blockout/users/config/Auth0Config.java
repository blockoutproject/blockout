package com.blockout.users.config;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.client.auth.AuthAPI;
import com.auth0.json.auth.TokenHolder;
import com.auth0.net.TokenRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class Auth0Config {

    @Value("${auth0.domain}")
    private String domain;

    @Value("${auth0.client-id}")
    private String clientId;

    @Value("${auth0.client-secret}")
    private String clientSecret;

    @Bean
    public ManagementAPI managementAPI() throws Exception {
        AuthAPI auth = AuthAPI.newBuilder(domain, clientId, clientSecret).build();
        TokenRequest tokenRequest = auth.requestToken(domain + "/api/v2/");
        TokenHolder holder = tokenRequest.execute().getBody();
        String accessToken = holder.getAccessToken();
        ManagementAPI managementAPI = ManagementAPI.newBuilder(domain, accessToken).build();
        return managementAPI;
    }
}