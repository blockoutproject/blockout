package com.blockout.workernotifications.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "api")
public class ApiClientProperties {

    private final Endpoint user = new Endpoint();
    private final Endpoint expo = new Endpoint();

    @Data
    public static class Endpoint {
        @NotBlank
        private String url;
    }
}