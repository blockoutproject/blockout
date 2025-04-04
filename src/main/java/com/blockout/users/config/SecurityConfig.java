package com.blockout.users.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                /*
                 * This is where we configure the security required for our endpoints and setup
                 * our app to serve as
                 * an OAuth2 Resource Server, using JWT validation.
                 */
                return http.csrf(csrf -> csrf.disable()) // Disable CSRF protection /!\ A ENLEVER PLUS TARD /!\
                                .authorizeHttpRequests((authorize) -> authorize
                                                .requestMatchers("/users/v1/**").authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2
                                                .jwt(Customizer.withDefaults()))
                                .build();
        }
}