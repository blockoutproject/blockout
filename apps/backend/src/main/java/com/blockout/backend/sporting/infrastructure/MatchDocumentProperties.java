package com.blockout.backend.sporting.infrastructure;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import java.util.Set;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Bounded on-demand relay settings; the empty origin set activates no supplier.
 *
 * @param informationUrl official FFVB form endpoint, independently origin-checked
 * @param connectTimeout positive connection deadline
 * @param readTimeout positive response deadline, also bounding each complete call
 * @param maxBytes decoded PDF byte limit
 * @param maxRedirects maximum explicitly validated redirects
 * @param allowedOrigins exact HTTP(S) origins, without paths, credentials or query
 */
@Validated
@ConfigurationProperties("blockout.consultation.documents")
public record MatchDocumentProperties(
    @NotNull URI informationUrl,
    @NotNull @DurationMin(millis = 1) Duration connectTimeout,
    @NotNull @DurationMin(millis = 1) Duration readTimeout,
    @Min(1) @Max(2147483646) int maxBytes,
    @Min(0) @Max(10) int maxRedirects,
    @NotNull Set<URI> allowedOrigins) {}
