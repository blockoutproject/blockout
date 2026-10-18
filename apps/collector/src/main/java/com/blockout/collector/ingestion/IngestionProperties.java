package com.blockout.collector.ingestion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.hibernate.validator.constraints.URL;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Validated ingestion settings; defaults and existing environment aliases belong to
 * application.yaml.
 *
 * @param baseUrl HTTP backend base URL; hosted environments supply their HTTPS origin
 * @param audience intended environment-specific ingestion API recipient
 * @param timeout positive maximum connect, pool lease and response wait
 */
@Validated
@ConfigurationProperties("blockout.ingestion")
public record IngestionProperties(
    @NotBlank @URL(regexp = "https?://.*") String baseUrl,
    @NotBlank String audience,
    @NotNull @DurationMin(inclusive = false) Duration timeout) {}
