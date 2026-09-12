package com.blockout.backend.api.config;

import com.blockout.backend.api.security.api.ApiRoutePolicy;
import com.blockout.backend.api.security.api.AuthenticationProblemHandler;
import java.util.List;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import tools.jackson.databind.json.JsonMapper;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class ApiSecurity {
  @Bean
  AuthenticationProblemHandler authenticationProblems(JsonMapper json) {
    return new AuthenticationProblemHandler(json);
  }

  @Bean
  @Order(1)
  SecurityFilterChain management(HttpSecurity http) throws Exception {
    return http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a.anyRequest().permitAll())
        .build();
  }

  @Bean
  SecurityFilterChain api(
      HttpSecurity http, List<ApiRoutePolicy> routes, AuthenticationProblemHandler problems)
      throws Exception {
    return http.csrf(c -> c.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a -> {
              routes.forEach(r -> r.configure(a));
              a.anyRequest().denyAll();
            })
        .exceptionHandling(e -> e.authenticationEntryPoint(problems).accessDeniedHandler(problems))
        .oauth2ResourceServer(o -> o.jwt(j -> {}).authenticationEntryPoint(problems))
        .build();
  }
}
