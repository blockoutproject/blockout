package com.blockout.backend.identity.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Binding metadata; creating a profile never provisions or mutates a billing customer. */
@Validated
@ConfigurationProperties("blockout.identity.billing")
public record BillingBindingProperties(
    @NotBlank @Size(max = 255) String projectId,
    @NotBlank @Pattern(regexp = "production|sandbox") String environment) {}
