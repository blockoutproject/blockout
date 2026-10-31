package com.blockout.backend.accounts.infrastructure;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import java.util.Set;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Opt-in destructive provider scope; credentials and exact test targets remain private env inputs.
 *
 * @param environment disabled by default; explicit production or isolated preproduction scope
 * @param preproductionConnection dedicated exclusive Auth0 database connection
 * @param revenueCatBaseUrl native v2 API base
 * @param revenueCatProjectId exact original project, absent before activation
 * @param revenueCatSecretKey backend-only v2 customer write credential
 * @param preproductionRevenueCatIds explicitly verified test-only customer targets
 * @param connectTimeout positive native connection deadline
 * @param readTimeout positive native request deadline
 */
@Validated
@ConfigurationProperties("blockout.accounts.cleanup")
public record AccountCleanupProperties(
    @NotNull Environment environment,
    String preproductionConnection,
    @NotNull URI revenueCatBaseUrl,
    String revenueCatProjectId,
    String revenueCatSecretKey,
    @NotNull Set<String> preproductionRevenueCatIds,
    @NotNull @DurationMin(millis = 1) Duration connectTimeout,
    @NotNull @DurationMin(millis = 1) Duration readTimeout) {
  /** Explicit destructive-operation activation; no environment is inferred from a customer ID. */
  public enum Environment {
    DISABLED,
    PREPRODUCTION,
    PRODUCTION
  }
}
