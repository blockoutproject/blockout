package com.blockout.backend.shared.image;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** The private application image destination for this backend environment. */
@Validated
@ConfigurationProperties("blockout.images")
record ImageStorageProperties(@NotBlank String bucket, @NotBlank String region) {}
