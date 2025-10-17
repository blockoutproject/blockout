package com.blockout.mobilegateway.config;

import jakarta.validation.Valid;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;


@Data
@Validated
@Component
@ConfigurationProperties(prefix = "pdf")
public class PdfProperties {

    @Valid
    private final Jwt jwt = new Jwt();

    @Valid
    private final Link link = new Link();

    @Data
    public static class Jwt {
        /**
         * Clé secrète Base64 utilisée pour signer les tokens PDF (HMAC-SHA256)
         */
        private String secret;
    }

    @Data
    public static class Link {
        /**
         * Durée de vie (en secondes) des URLs PDF temporaires
         */
        private long ttlSeconds = 120;
    }
}