package com.blockout.reports.report.infrastructure.discord;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/** Provides a Discord-only HTTP client with no inbound authentication propagation. */
@Configuration
public class DiscordHttpConfiguration {

    /** Creates the isolated webhook client. */
    @Bean
    public RestTemplate discordRestTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }
}
