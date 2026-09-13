package com.blockout.backend.api.config;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Deployment supplies HTTPS endpoints; local HTTP servers are used by integration tests. */
@Validated
@ConfigurationProperties("blockout.auth")
public record AuthProperties(
    @NotBlank @URL(regexp = "https?://.+") String issuer,
    @NotBlank String audience,
    @NotBlank @URL(regexp = "https?://.+") String jwkSetUri) {}
