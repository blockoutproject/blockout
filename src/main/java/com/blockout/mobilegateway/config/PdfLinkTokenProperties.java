package com.blockout.mobilegateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Component
@ConfigurationProperties(prefix = "pdf-link-token")
public class PdfLinkTokenProperties {
    private String secret;
    private long ttlSeconds = 180;
    private String kid = "primary";
}