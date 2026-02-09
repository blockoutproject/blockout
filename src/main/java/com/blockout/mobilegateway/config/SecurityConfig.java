package com.blockout.mobilegateway.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtDebugFilter jwtDebugFilter;

    // TODOZ
    // @Bean
    // @Order(1)
    // public SecurityFilterChain publicChain(HttpSecurity http) throws Exception {
    // return http
    // .securityMatcher("/api/v1/mobile/public/**")
    // .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
    // .addFilterBefore(jwtDebugFilter, UsernamePasswordAuthenticationFilter.class)
    // .csrf(csrf -> csrf.disable())
    // .cors(withDefaults())
    // .build();
    // }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .authorizeHttpRequests(authz -> authz
                        .anyRequest().permitAll());

        // IMPORTANT: ne pas configurer oauth2ResourceServer(jwt)
        return http.build();
    }

    // @Bean
    // @Order(2)
    // public SecurityFilterChain secureChain(HttpSecurity http) throws Exception {
    // return http
    // .securityMatcher("/api/v1/mobile/secure/**")
    // .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
    // .addFilterBefore(jwtDebugFilter, UsernamePasswordAuthenticationFilter.class)
    // .oauth2ResourceServer(oauth -> oauth.jwt(withDefaults()))
    // .csrf(csrf -> csrf.disable())
    // .cors(withDefaults())
    // .build();
    // }
}