package com.blockout.backend.accounts.infrastructure;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import java.util.Set;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Instance-owned provider configuration for original account erasure.
 *
 * @param auth0Connections exact connections this backend may erase, empty for sign-in-only access
 * @param revenueCatBaseUrl native v2 API base
 * @param revenueCatProjectId exact original project, absent before activation
 * @param revenueCatSecretKey backend-only v2 customer write credential
 * @param connectTimeout positive native connection deadline
 * @param readTimeout positive native request deadline
 */
@Validated
@ConfigurationProperties("blockout.accounts.cleanup")
public record AccountCleanupProperties(
    @NotNull Set<String> auth0Connections,
    @NotNull URI revenueCatBaseUrl,
    String revenueCatProjectId,
    String revenueCatSecretKey,
    @NotNull @DurationMin(millis = 1) Duration connectTimeout,
    @NotNull @DurationMin(millis = 1) Duration readTimeout) {}
