package com.blockout.clubs.club.geocoding.infrastructure;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class MapboxHttpConfig {

    @Bean
    RestTemplate mapboxRestTemplate() {
        return new RestTemplate();
    }
}
