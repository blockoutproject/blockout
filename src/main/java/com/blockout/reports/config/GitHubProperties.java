package com.blockout.reports.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "github")
public class GitHubProperties {

    @NotBlank
    private String token;

    @NotBlank
    private String owner;

    @NotBlank
    private String repo;

    private String apiBaseUrl;
}