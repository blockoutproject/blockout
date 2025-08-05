package com.blockout.users.config;

import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.blockout.users.config.filters.ApiKeyFilter;

@Configuration
@RequiredArgsConstructor
public class ApiKeySecurityConfig {

    private final ApiKeyFilter apiKeyFilter;

    @Bean
    @Order(1)
    public SecurityFilterChain apiKeyFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/internal/**")
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .addFilterBefore(apiKeyFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}