package com.blockout.backend.api.config;

import java.net.URI;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Trusted JWT endpoints require HTTPS; plain HTTP is opt-in and loopback-only for fixtures. */
@ConfigurationProperties("blockout.auth")
public record AuthProperties(
    String issuer, String audience, String jwkSetUri, boolean allowInsecureLoopback) {
  public AuthProperties {
    if (audience == null || audience.isBlank())
      throw new IllegalArgumentException("JWT audience is required");
    validateEndpoint(issuer, allowInsecureLoopback);
    validateEndpoint(jwkSetUri, allowInsecureLoopback);
  }

  private static void validateEndpoint(String value, boolean allowInsecureLoopback) {
    URI uri;
    try {
      uri = URI.create(value == null ? "" : value);
    } catch (IllegalArgumentException invalid) {
      throw new IllegalArgumentException("Invalid JWT endpoint");
    }
    boolean loopback =
        Set.of("127.0.0.1", "localhost", "[::1]")
            .contains(uri.getHost() == null ? "" : uri.getHost());
    if (uri.getHost() == null
        || uri.getUserInfo() != null
        || uri.getQuery() != null
        || uri.getFragment() != null
        || !("https".equals(uri.getScheme())
            || (allowInsecureLoopback && loopback && "http".equals(uri.getScheme()))))
      throw new IllegalArgumentException("JWT endpoints require trusted HTTPS URLs");
  }
}
