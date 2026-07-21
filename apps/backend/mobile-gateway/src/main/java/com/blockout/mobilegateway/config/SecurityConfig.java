package com.blockout.mobilegateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain publicChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/api/v1/mobile/public/**")
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .csrf(csrf -> csrf.disable())
            .cors(withDefaults())
            .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain secureChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/api/v1/mobile/secure/**")
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth.jwt(withDefaults()))
            .csrf(csrf -> csrf.disable())
            .cors(withDefaults())
            .build();
    }
}
