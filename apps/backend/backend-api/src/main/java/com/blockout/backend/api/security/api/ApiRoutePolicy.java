package com.blockout.backend.api.security.api;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;

/**
 * Explicit product-route registration at the HTTP security boundary. Register only owned matchers;
 * do not configure anyRequest, which the assembly terminates with denyAll. Domain permissions
 * remain owner-controlled through method security. An absent registration always fails closed.
 */
@FunctionalInterface
public interface ApiRoutePolicy {
  void configure(
      AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
          requests);
}
