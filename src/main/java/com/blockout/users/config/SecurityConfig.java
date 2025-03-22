package com.blockout.users.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

// @Configuration
// public class MultiChainSecurityConfig {

//     @Value("${api.key}")
//     private String apiKey;

//     /**
//      * Chaîne n°1 (priorité 1) :
//      * - Matche la route : POST /users/v1/users (uniquement)
//      * - Authentification : API Key via ApiKeyAuthFilter
//      * - Résultat : besoin d'envoyer X-Api-Key pour réussir => sinon 401
//      */
//     @Bean
//     @Order(1)
//     public SecurityFilterChain apiKeyChain(HttpSecurity http) throws Exception {
//         http
//                 // 1) On cible précisément la route POST /users/v1/users
//                 .securityMatcher(httpRequest -> httpRequest.getRequestURI().equals("/users/v1/internal"))

//                 // 2) Pas de session, pas de CSRF
//                 .csrf(csrf -> csrf.disable())
//                 .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

//                 // 3) Toute requête dans ce matcher => doit être "authentifiée" par API Key
//                 .authorizeHttpRequests(auth -> auth
//                         .anyRequest().authenticated())

//                 // 4) On ajoute le filtre custom pour checker X-Api-Key
//                 .addFilterBefore(new ApiKeyAuthFilter("X-Api-Key", apiKey),
//                         BasicAuthenticationFilter.class);

//         return http.build();
//     }

//     /**
//      * Chaîne n°2 (priorité 2) :
//      * - Pour tout le reste des routes
//      * - GET /users/v1/users/auth0/** => besoin d'un Bearer token (JWT)
//      * - Le reste => libre (permitAll)
//      */
//     @Bean
//     @Order(2)
//     public SecurityFilterChain bearerChain(HttpSecurity http) throws Exception {
//         http
//                 // Pas de `securityMatcher` => s'applique à tout ce qui n'a pas été matché par
//                 // la chaîne précédente
//                 .csrf(csrf -> csrf.disable())
//                 .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

//                 .authorizeHttpRequests(auth -> auth
//                         // Requiert un Bearer token valide pour GET /users/v1/users/auth0/...
//                         .requestMatchers(HttpMethod.POST, "/users/v1/users").authenticated()
//                         .requestMatchers(HttpMethod.GET, "/users/v1/users/auth0/**").authenticated()
//                         // Tout le reste => autorisé
//                         .anyRequest().permitAll())

//                 // Active la validation JWT en mode Resource Server
//                 .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

//         return http.build();
//     }
// }

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        /*
         * This is where we configure the security required for our endpoints and setup
         * our app to serve as
         * an OAuth2 Resource Server, using JWT validation.
         */
        return http
                .csrf(csrf -> csrf.disable()) // Disable CSRF protection /!\ A ENLEVER PLUS TARD /!\
                .authorizeHttpRequests((authorize) -> authorize
                        .requestMatchers(HttpMethod.POST, "/users/v1/users").authenticated()
                        .requestMatchers(HttpMethod.GET, "/users/v1/users/auth0/**").authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults()))
                .build();
    }
}