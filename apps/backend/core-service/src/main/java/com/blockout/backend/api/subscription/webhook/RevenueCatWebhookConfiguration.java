package com.blockout.backend.api.subscription.webhook;

import com.blockout.backend.api.security.api.AuthenticationProblemHandler;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/** Checks RevenueCat's configured Authorization header independently of native-user JWTs. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RevenueCatWebhookProperties.class)
public class RevenueCatWebhookConfiguration {
  /**
   * Uses the provider's shared secret over HTTPS. Spring checks the header before MVC reads the
   * body; no custom filter, JSON interception or signature protocol is needed. Cookies and sessions
   * do not authenticate this endpoint, so CSRF tokens do not apply.
   *
   * @param http Spring's dedicated webhook chain builder
   * @param properties exact Authorization value configured in RevenueCat
   * @param problems existing safe security response writer
   * @return the chain selected after private management and before the bearer API
   */
  @Bean
  @Order(2)
  SecurityFilterChain revenueCatWebhookSecurity(
      HttpSecurity http,
      RevenueCatWebhookProperties properties,
      AuthenticationProblemHandler problems) {
    byte[] expected = properties.authorization().getBytes(StandardCharsets.UTF_8);
    return http.securityMatcher("/api/v2/webhooks/revenuecat")
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            requests ->
                requests
                    .anyRequest()
                    .access(
                        (_, context) -> {
                          String received =
                              context.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
                          return new AuthorizationDecision(
                              received != null
                                  && MessageDigest.isEqual(
                                      expected, received.getBytes(StandardCharsets.UTF_8)));
                        }))
        .exceptionHandling(
            errors -> errors.authenticationEntryPoint(problems::webhookAuthenticationRequired))
        .build();
  }
}
