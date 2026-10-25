package com.blockout.backend.search.infrastructure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Owned environment namespace shared by the three native resource aliases. */
@Validated
@ConfigurationProperties("blockout.search.indexes")
public record SearchIndexProperties(
    @NotBlank @Pattern(regexp = "[a-z0-9][a-z0-9_-]*") String prefix) {}
