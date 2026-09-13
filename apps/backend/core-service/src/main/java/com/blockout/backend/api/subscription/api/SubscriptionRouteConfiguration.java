package com.blockout.backend.api.subscription.api;

import com.blockout.backend.api.security.api.ApiRoutePolicy;
import org.springframework.context.annotation.*;

/** Registers current-user resources; MVC retains unsupported-method handling. */
@Configuration(proxyBeanMethods = false)
public class SubscriptionRouteConfiguration {
  /**
   * Requires bearer authentication before native-owner extraction.
   *
   * @return subscription route policy
   */
  @Bean
  ApiRoutePolicy subscriptionRoutePolicy() {
    return requests ->
        requests
            .requestMatchers(
                "/api/v2/users/me/subscription", "/api/v2/users/me/subscription-refreshes")
            .authenticated();
  }
}
