package com.blockout.backend.worker;

import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
public class WorkerSecurity {
  @Bean
  @Order(1)
  SecurityFilterChain management(HttpSecurity http) throws Exception {
    return http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a.anyRequest().permitAll())
        .build();
  }

  @Bean
  SecurityFilterChain deny(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(a -> a.anyRequest().denyAll()).build();
  }
}
