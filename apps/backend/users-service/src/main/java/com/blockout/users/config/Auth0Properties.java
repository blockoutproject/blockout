package com.blockout.users.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Duration;
import java.time.temporal.ChronoUnit;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.convert.DurationUnit;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "auth0")
public class Auth0Properties {

    @NotBlank
    private String domain;

    @NotBlank
    private String clientId;

    @NotBlank
    private String clientSecret;

    @NotBlank
    private String defaultUserRoleId;

    @NotBlank
    private String audience;

    @DurationUnit(ChronoUnit.MILLIS)
    private Duration tokenRefreshDelay;
}