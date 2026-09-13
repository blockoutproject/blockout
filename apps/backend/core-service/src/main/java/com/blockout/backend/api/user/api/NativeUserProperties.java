package com.blockout.backend.api.user.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Only configured native public clients can bootstrap personal profiles. */
@Validated
@ConfigurationProperties("blockout.identity")
public record NativeUserProperties(@NotEmpty Set<@NotBlank String> nativeClientIds) {}
