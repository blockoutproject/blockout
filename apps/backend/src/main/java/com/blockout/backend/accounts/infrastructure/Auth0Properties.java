package com.blockout.backend.accounts.infrastructure;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.hibernate.validator.constraints.time.DurationMin;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Backend-only optional Management API configuration; missing registration/audience fails closed.
 *
 * @param audience exact Management API audience/base URL, absent before environment activation
 * @param connectTimeout positive native connect deadline
 * @param readTimeout positive total response deadline
 */
@Validated
@ConfigurationProperties("blockout.accounts.auth0")
public record Auth0Properties(
    URI audience,
    @NotNull @DurationMin(millis = 1) Duration connectTimeout,
    @NotNull @DurationMin(millis = 1) Duration readTimeout) {}
