package com.blockout.backend.support.infrastructure;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Server-owned private support settings. A deployment with a destination must supply all its
 * fields. Qualify effective repository permissions and actual attachment access before accepting
 * real requests.
 *
 * @param destination fixed private provider inputs, absent until explicitly configured
 * @param connectTimeout positive HTTP connection wait
 * @param readTimeout positive HTTP response wait
 * @param processTimeout positive CLI completion wait
 */
@Validated
@ConfigurationProperties("blockout.support")
public record SupportProperties(
    @Valid Destination destination,
    @NotNull @DurationMin(millis = 1) Duration connectTimeout,
    @NotNull @DurationMin(millis = 1) Duration readTimeout,
    @NotNull @DurationMin(millis = 1) Duration processTimeout) {

  /**
   * Complete operator-selected destination, never selected by submitted input. Secrets are supplied
   * through Spring external configuration and excluded from the string representation.
   *
   * @param repository qualified private GitHub owner/repository
   * @param incompleteLabel pre-created label for partial intake
   * @param completeLabel pre-created label for complete intake
   * @param githubToken repository-scoped credential for the GitHub REST and CLI adapters
   * @param discordWebhook private Discord webhook, itself a credential
   */
  public record Destination(
      @NotBlank @Pattern(regexp = "[A-Za-z0-9-]+/[A-Za-z0-9_.-]+") String repository,
      @NotBlank String incompleteLabel,
      @NotBlank String completeLabel,
      @NotBlank String githubToken,
      @NotBlank @Pattern(regexp = "https://discord\\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+")
          String discordWebhook) {
    /**
     * Prevents one case-insensitive GitHub label from representing both partial and complete
     * intake.
     *
     * @return whether supplied intake labels differ; required-value checks own missing labels
     */
    @AssertTrue(message = "Intake labels must differ")
    public boolean isIntakeDistinct() {
      return incompleteLabel == null
          || completeLabel == null
          || !incompleteLabel.equalsIgnoreCase(completeLabel);
    }

    /** Keeps credentials and the private repository out of incidental object rendering. */
    @Override
    public String toString() {
      return "SupportDestination[redacted]";
    }
  }
}
