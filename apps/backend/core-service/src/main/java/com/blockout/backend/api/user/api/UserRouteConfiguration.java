package com.blockout.backend.api.user.api;

import com.blockout.backend.api.security.api.ApiRoutePolicy;
import com.blockout.backend.identity.config.IdentityProfileConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;

/** Registers the current-user HTTP resource and imports its identity owner. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(NativeUserProperties.class)
@Import(IdentityProfileConfiguration.class)
public class UserRouteConfiguration {
  /**
   * Requires authentication for the profile resource; MVC owns supported-method validation.
   *
   * @return the route policy consumed by the API security assembly
   */
  @Bean
  ApiRoutePolicy userRoutePolicy() {
    // MVC owns supported methods; authenticated unsupported requests receive HTTP 405.
    return requests -> requests.requestMatchers("/api/v2/users/me").authenticated();
  }
}
