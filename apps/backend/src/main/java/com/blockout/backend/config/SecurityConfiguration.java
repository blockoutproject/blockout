package com.blockout.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/** Protects operational paths; domain authentication remains with the owning JWT security lot. */
@Configuration(proxyBeanMethods = false)
public class SecurityConfiguration {
  /**
   * Allows only the aggregate GET probe and refuses other operational paths without a local login.
   *
   * @param http native security builder for the operational route boundary
   * @return chain scoped to the probe and Actuator paths, leaving business routes to their owners
   * @throws Exception if Spring cannot construct its security filters
   */
  @Bean
  SecurityFilterChain operationalSecurity(HttpSecurity http) throws Exception {
    return http.securityMatcher("/health", "/health/**", "/actuator", "/actuator/**")
        .authorizeHttpRequests(
            requests ->
                requests
                    .requestMatchers(HttpMethod.GET, "/health")
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .build();
  }
}
