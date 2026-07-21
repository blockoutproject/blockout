package com.blockout.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that config-service can construct its complete Spring context.
 */
@SpringBootTest
@DisplayName("Config application smoke")
class ConfigApplicationSmokeTest {

    /**
     * Starts the complete application context against the configured local dependencies.
     */
    @Test
    @DisplayName("loads the config-service application context")
    void loadsApplicationContext() {
    }
}
