package com.blockout.clubs.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "mapbox")
public class MapboxProperties {

    @NotBlank
    private String accessToken;
}