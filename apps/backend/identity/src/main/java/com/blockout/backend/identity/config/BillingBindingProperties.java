package com.blockout.backend.identity.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binding metadata only: creating a business profile never provisions or mutates a billing
 * customer.
 */
@ConfigurationProperties("blockout.identity.billing")
public record BillingBindingProperties(String projectId, String environment) {
  public BillingBindingProperties {
    if (projectId == null
        || projectId.isBlank()
        || projectId.length() > 255
        || !java.util.Set.of("production", "sandbox")
            .contains(environment == null ? "" : environment))
      throw new IllegalArgumentException("Invalid billing binding configuration");
  }
}
