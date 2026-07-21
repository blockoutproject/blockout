package com.blockout.teams;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that the teams-service application context remains bootable.
 */
@SpringBootTest
@DisplayName("Teams application smoke test")
class TeamsApplicationSmokeTest {

    @Test
    @DisplayName("loads the Spring application context")
    void loadsTheSpringApplicationContext() {
    }
}
