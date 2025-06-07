package com.blockout.workersearch.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "elasticsearch")
public class ElasticsearchProperties {

    @NotBlank
    private String host;

    @NotBlank
    private String username;

    @NotBlank
    private String password;
}