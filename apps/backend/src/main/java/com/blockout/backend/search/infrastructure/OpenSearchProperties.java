package com.blockout.backend.search.infrastructure;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Backend-only connection settings; native Boot SSL bundles own trusted certificates. */
@Validated
@ConfigurationProperties("blockout.search")
public record OpenSearchProperties(
    @NotNull URI endpoint,
    @NotBlank String username,
    @NotBlank String password,
    @NotBlank String sslBundle,
    @Positive long connectTimeoutMillis,
    @Positive long requestTimeoutMillis) {
  /** Rejects plaintext or credential-bearing destinations before creating the native transport. */
  @AssertTrue(message = "must use an HTTPS origin without embedded credentials")
  public boolean isSecureEndpoint() {
    return endpoint != null
        && "https".equals(endpoint.getScheme())
        && endpoint.getHost() != null
        && endpoint.getUserInfo() == null
        && endpoint.getQuery() == null
        && endpoint.getFragment() == null
        && (endpoint.getPath().isEmpty() || "/".equals(endpoint.getPath()));
  }
}
