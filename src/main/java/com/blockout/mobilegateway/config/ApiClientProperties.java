package com.blockout.mobilegateway.config;

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

    private final Endpoint team = new Endpoint();
    private final Endpoint pool = new Endpoint();
    private final Endpoint match = new Endpoint();
    private final Endpoint config = new Endpoint();
    private final Endpoint competition = new Endpoint();
    private final Endpoint club = new Endpoint();
    private final Endpoint notification = new Endpoint();
    private final Endpoint mobilegateway = new Endpoint();

    @Data
    public static class Endpoint {
        @NotBlank
        private String url;
    }
}