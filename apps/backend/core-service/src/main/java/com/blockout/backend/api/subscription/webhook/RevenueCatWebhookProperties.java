package com.blockout.backend.api.subscription.webhook;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * API-only webhook credential; no RevenueCat API key belongs in this process.
 *
 * @param authorization complete secret Authorization value configured on the retained integration
 */
@Validated
@ConfigurationProperties("blockout.revenuecat.webhook")
public record RevenueCatWebhookProperties(@NotBlank String authorization) {}
