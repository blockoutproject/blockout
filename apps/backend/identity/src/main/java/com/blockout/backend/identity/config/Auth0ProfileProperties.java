package com.blockout.backend.identity.config;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Operator-configured Auth0 origin. Production uses HTTPS; credentials never enter diagnostics.
 *
 * @param baseUrl Auth0 origin for the Management API and token endpoint
 * @param clientId read-only Management API client identifier
 * @param clientSecret private credential consumed only by the provider adapter
 */
@Validated
@ConfigurationProperties("blockout.identity.auth0")
public record Auth0ProfileProperties(
    @NotBlank @URL(regexp = "https?://.+") String baseUrl,
    @NotBlank String clientId,
    @NotBlank String clientSecret) {
  /**
   * {@inheritDoc} Returns a redacted representation so configuration diagnostics cannot expose
   * credentials.
   */
  @Override
  public String toString() {
    return "Auth0ProfileProperties[redacted]";
  }
}
