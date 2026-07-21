package com.blockout.clubs;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that clubs-service starts with its imported infrastructure configuration.
 */
@DisplayName("Clubs application smoke")
@SpringBootTest(properties = {
    "clubs.geocoding.initial-delay=86400000",
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/unused"
})
class ClubsApplicationSmokeTest {

    /**
     * Starts the complete Spring application context.
     */
    @DisplayName("starts the application context")
    @Test
    void contextLoads() {
    }

}
