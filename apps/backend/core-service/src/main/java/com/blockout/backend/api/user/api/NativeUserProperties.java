package com.blockout.backend.api.user.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Restricts business-profile bootstrap to configured native public clients.
 *
 * @param nativeClientIds accepted authorized-party identifiers from verified user JWTs
 */
@Validated
@ConfigurationProperties("blockout.identity")
public record NativeUserProperties(@NotEmpty Set<@NotBlank String> nativeClientIds) {}
