package com.blockout.backend.api.config;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * JWT trust configuration. Production supplies HTTPS; isolated tests may use HTTP fixtures.
 *
 * @param issuer exact expected issuer claim
 * @param audience required Blockout API audience
 * @param jwkSetUri key-set endpoint used by the standard decoder
 */
@Validated
@ConfigurationProperties("blockout.auth")
public record AuthProperties(
    @NotBlank @URL(regexp = "https?://.+") String issuer,
    @NotBlank String audience,
    @NotBlank @URL(regexp = "https?://.+") String jwkSetUri) {}
