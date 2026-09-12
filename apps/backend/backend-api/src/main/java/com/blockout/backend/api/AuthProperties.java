package com.blockout.backend.api;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("blockout.auth")
public record AuthProperties(
    @NotBlank String issuer, @NotBlank String audience, @NotBlank String jwkSetUri) {}
