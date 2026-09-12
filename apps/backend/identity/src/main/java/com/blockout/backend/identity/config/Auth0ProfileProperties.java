package com.blockout.backend.identity.config;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * One trusted Management API origin; the HTTP exception is restricted to explicit loopback
 * fixtures.
 */
@ConfigurationProperties("blockout.identity.auth0")
public record Auth0ProfileProperties(
    URI baseUrl, String clientId, String clientSecret, boolean allowInsecureLoopback) {
  public Auth0ProfileProperties {
    if (baseUrl == null
        || baseUrl.getHost() == null
        || baseUrl.getUserInfo() != null
        || baseUrl.getQuery() != null
        || baseUrl.getFragment() != null
        || !(baseUrl.getPath().isEmpty() || baseUrl.getPath().equals("/"))
        || clientId == null
        || clientId.isBlank()
        || clientSecret == null
        || clientSecret.isBlank())
      throw new IllegalArgumentException("Invalid identity provider configuration");
    boolean loopback =
        java.util.Set.of("127.0.0.1", "localhost", "[::1]", "::1").contains(baseUrl.getHost());
    if (!"https".equals(baseUrl.getScheme())
        && !(allowInsecureLoopback && loopback && "http".equals(baseUrl.getScheme())))
      throw new IllegalArgumentException("Identity provider requires HTTPS");
  }

  @Override
  public String toString() {
    return "Auth0ProfileProperties[redacted]";
  }
}
