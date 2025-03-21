package com.blockout.users.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.http.HttpMethod;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
public class SecurityConfig {

    @Value("${api.key}")
    private String apiKey;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        
        // Configure les règles d'autorisation
        http.authorizeHttpRequests(auth -> auth
                // Protège le GET /users/v1/users/auth0/** avec JWT (bearer token Auth0)
                .requestMatchers(HttpMethod.GET, "/users/v1/users/auth0/**").authenticated()
                
                // Tout appel POST /users/v1/users doit passer l'API Key
                // (vérifiée par notre filtre custom 'ApiKeyAuthFilter')
                // On laisse ici la permission (permitAll) afin de laisser passer
                // la requête jusqu'au filtre, qui décidera de bloquer ou non.
                .requestMatchers(HttpMethod.POST, "/users/v1/users").permitAll()
                
                // Autorise le reste librement (ex: swagger, etc.)
                .anyRequest().permitAll()
        );
        
        // Active CORS
        http.cors(withDefaults());

        // Active la validation JWT pour la partie OAuth2 Resource Server
        http.oauth2ResourceServer(oauth2 -> oauth2.jwt(withDefaults()));

        // Ajout du filtre pour gérer l'API Key AVANT BasicAuthenticationFilter
        http.addFilterBefore(new ApiKeyAuthFilter("X-Api-Key", apiKey),
                             BasicAuthenticationFilter.class);

        return http.build();
    }
}