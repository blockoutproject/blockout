package com.blockout.backend.api;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;

/** Explicit route registration at the HTTP boundary; domain permissions remain owner-controlled. */
@FunctionalInterface
public interface ApiRoutePolicy {
  void configure(
      AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
          requests);
}
