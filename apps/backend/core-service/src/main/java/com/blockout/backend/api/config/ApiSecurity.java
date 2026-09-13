package com.blockout.backend.api.config;

import com.blockout.backend.api.security.api.ApiRoutePolicy;
import com.blockout.backend.api.security.api.AuthenticationProblemHandler;
import java.util.List;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import tools.jackson.databind.json.JsonMapper;

/** Assembles bearer-only product security and the separately exposed management chain. */
@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class ApiSecurity {
  /**
   * Shares native Problem Detail handling across authentication and access-denied boundaries.
   *
   * @param json Boot-configured mapper with native ProblemDetail support
   * @return the safe security response writer
   */
  @Bean
  AuthenticationProblemHandler authenticationProblems(JsonMapper json) {
    return new AuthenticationProblemHandler(json);
  }

  /**
   * Allows configured Actuator endpoints on the private management surface.
   *
   * @param http Spring builder for the management filter chain
   * @return the chain evaluated before product authorization
   */
  @Bean
  @Order(1)
  SecurityFilterChain management(HttpSecurity http) {
    return http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a.anyRequest().permitAll())
        .build();
  }

  /**
   * Applies feature-owned route rules and rejects every unregistered product request.
   * Authentication comes only from bearer headers; cookies and server sessions do not authenticate.
   *
   * @param http Spring builder for product security
   * @param routes feature-owned matcher registrations
   * @param problems safe authentication and authorization responses
   * @return the stateless resource-server chain
   */
  @Bean
  SecurityFilterChain api(
      HttpSecurity http, List<ApiRoutePolicy> routes, AuthenticationProblemHandler problems) {
    // Authentication uses only the Authorization bearer header, never browser-sent cookies.
    return http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a -> {
              routes.forEach(r -> r.configure(a));
              a.anyRequest().denyAll();
            })
        .exceptionHandling(e -> e.authenticationEntryPoint(problems).accessDeniedHandler(problems))
        .oauth2ResourceServer(
            o -> o.jwt(Customizer.withDefaults()).authenticationEntryPoint(problems))
        .build();
  }
}
