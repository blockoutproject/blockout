package com.blockout.collector.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Duration;
import java.util.List;
import org.hibernate.validator.constraints.URL;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Source boundaries and per-provider budgets for the single collector instance. Defaults belong to
 * application.yaml; the native transport consumes these limits without a second configuration
 * loader.
 *
 * @param ffvbOrigins exact allowed FFVB origins, including redirect destinations
 * @param lnvOrigins exact allowed LNV origins, including DataProject and its image origin
 * @param ignOrigins exact allowed municipal geocoding origins
 * @param timeout positive maximum wait for connection, pool lease and response
 * @param maxResponseBytes maximum complete decompressed response size; overflow must fail
 * @param maxRedirects maximum redirects, each still subject to the provider's origin boundary
 * @param concurrencyPerProvider maximum active requests/connections shared across seasons and
 *     families
 * @param permitsPerPeriod provider request permits shared across seasons and families
 * @param refreshPeriod positive native RateLimiter permit refresh period
 * @param permitTimeout maximum permit wait; zero requests immediate refusal when exhausted
 * @param documentTeamAssociations verified auxiliary document labels; empty leaves them unavailable
 */
@Validated
@ConfigurationProperties("blockout.acquisition")
public record AcquisitionProperties(
    @NotEmpty List<@NotBlank @URL(regexp = "https?://[^/?#@\\s]+") String> ffvbOrigins,
    @NotEmpty List<@NotBlank @URL(regexp = "https?://[^/?#@\\s]+") String> lnvOrigins,
    @NotEmpty List<@NotBlank @URL(regexp = "https?://[^/?#@\\s]+") String> ignOrigins,
    @NotNull @DurationMin(inclusive = false) Duration timeout,
    @Positive int maxResponseBytes,
    @PositiveOrZero int maxRedirects,
    @Positive int concurrencyPerProvider,
    @Positive int permitsPerPeriod,
    @NotNull @DurationMin(inclusive = false) Duration refreshPeriod,
    @NotNull @DurationMin Duration permitTimeout,
    @NotNull List<@Valid DocumentTeamAssociation> documentTeamAssociations) {

  /**
   * Verified provider association used only to identify auxiliary professional information sheets.
   * It does not establish sporting identity or supply an unqualified historical reference.
   *
   * @param seasonStartYear owning sporting season's start year
   * @param championshipReference native championship identity within that season
   * @param nativeTeamReference exact DataProject team identity within the championship
   * @param xmlTeamLabel verified exact label in the applicable LNV document index
   */
  public record DocumentTeamAssociation(
      @Min(1900) long seasonStartYear,
      @NotBlank String championshipReference,
      @NotBlank String nativeTeamReference,
      @NotBlank String xmlTeamLabel) {}
}
