package com.blockout.backend.api.subscription.webhook;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/** Isolates provider HMAC authentication from the native-user bearer resource server. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RevenueCatWebhookProperties.class)
public class RevenueCatWebhookConfiguration {
  /**
   * Leaves authentication to raw-body HMAC advice, ignoring optional provider Authorization
   * headers. Cookies and sessions never authenticate this signed provider endpoint, so CSRF tokens
   * do not apply.
   *
   * @param http Spring's dedicated webhook chain builder
   * @return the chain selected after private management and before the bearer API
   */
  @Bean
  @Order(2)
  SecurityFilterChain revenueCatWebhookSecurity(HttpSecurity http) {
    return http.securityMatcher("/api/v2/webhooks/revenuecat")
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
        .build();
  }
}
