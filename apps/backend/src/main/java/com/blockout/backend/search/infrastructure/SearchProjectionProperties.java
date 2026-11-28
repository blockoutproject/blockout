package com.blockout.backend.search.infrastructure;

import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Ordinary full-run catch-up cadence; this is not a freshness deadline. */
@Validated
@ConfigurationProperties("blockout.search.projection")
public record SearchProjectionProperties(
    @NotNull @DurationMin(millis = 1) Duration fullRebuildDelay) {}
