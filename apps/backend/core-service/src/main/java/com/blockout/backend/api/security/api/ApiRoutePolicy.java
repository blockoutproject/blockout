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
  /**
   * Registers the owning feature matchers without terminating the assembly-wide rule chain.
   *
   * @param requests Spring authorization registry; leave anyRequest to the API assembly
   */
  void configure(
      AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
          requests);
}
