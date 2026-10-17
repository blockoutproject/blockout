package com.blockout.backend.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Public Auth0 trust inputs for the two environment-specific API boundaries.
 *
 * @param issuer exact Auth0 issuer; its standard JWKS endpoint supplies trusted public keys
 * @param mobileAudience intended mobile API recipient
 * @param mobileClientId authorized native application, read from the Auth0 profile's azp claim
 * @param ingestionAudience distinct collector API recipient
 * @param ingestionClientId authorized M2M application
 */
@Validated
@ConfigurationProperties("blockout.security")
public record SecurityProperties(
    @NotNull URI issuer,
    @NotBlank String mobileAudience,
    @NotBlank String mobileClientId,
    @NotBlank String ingestionAudience,
    @NotBlank String ingestionClientId) {}
