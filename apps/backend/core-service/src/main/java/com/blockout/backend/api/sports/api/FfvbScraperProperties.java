package com.blockout.backend.api.sports.api;

import jakarta.validation.constraints.*;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** Dedicated machine clients; an empty allowlist keeps scraper reads disabled. */
@Validated
@ConfigurationProperties("blockout.ffvb.scraper")
public record FfvbScraperProperties(@DefaultValue @NotNull Set<@NotBlank String> clientIds) {}
