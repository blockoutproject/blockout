package com.blockout.notifications.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimeConfig {

    /** Provides one UTC application clock for deterministic state timestamps. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
