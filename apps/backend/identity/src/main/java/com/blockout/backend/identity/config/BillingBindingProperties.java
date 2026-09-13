package com.blockout.backend.identity.config;

import com.blockout.backend.identity.subscription.domain.BillingEnvironment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Retains billing metadata locally; profile creation never mutates an external billing customer.
 *
 * @param projectId existing RevenueCat project containing the retained customer
 * @param environment production or sandbox namespace for the binding
 */
@Validated
@ConfigurationProperties("blockout.identity.billing")
public record BillingBindingProperties(
    @NotBlank @Size(max = 255) String projectId, @NotNull BillingEnvironment environment) {}
