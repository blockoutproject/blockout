package com.blockout.mobilegateway.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "ffvb.proxy")
public class FfvbProxyProperties {

    @NotBlank
    private String host;
    
    private int port = 8888;
}