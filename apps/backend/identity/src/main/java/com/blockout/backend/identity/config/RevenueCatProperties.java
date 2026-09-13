package com.blockout.backend.identity.config;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Worker-only read credentials and exact Pro entitlement configuration.
 *
 * @param baseUrl API origin; HTTPS in deployment, HTTP only for controlled fixtures
 * @param secretKey read-only RevenueCat V2 key
 * @param entitlementId exact RevenueCat entitlement resource ID
 */
@Validated
@ConfigurationProperties("blockout.revenuecat")
public record RevenueCatProperties(
    @NotBlank @URL String baseUrl, @NotBlank String secretKey, @NotBlank String entitlementId) {}
