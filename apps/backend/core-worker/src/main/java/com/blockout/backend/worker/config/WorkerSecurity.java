package com.blockout.backend.worker.config;

import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/** Exposes configured private management endpoints while rejecting all worker product routes. */
@Configuration(proxyBeanMethods = false)
public class WorkerSecurity {
  /**
   * Allows configured Actuator routes on the privately bound management surface.
   *
   * @param http Spring management-chain builder
   * @return the highest-priority management chain
   */
  @Bean
  @Order(1)
  SecurityFilterChain management(HttpSecurity http) {
    return http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a.anyRequest().permitAll())
        .build();
  }

  /**
   * Rejects every request outside the configured management endpoints.
   *
   * @param http Spring fallback-chain builder
   * @return the worker product-route deny chain
   */
  @Bean
  SecurityFilterChain deny(HttpSecurity http) {
    return http.authorizeHttpRequests(a -> a.anyRequest().denyAll()).build();
  }
}
