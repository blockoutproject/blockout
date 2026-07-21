package com.blockout.pools;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that the pools-service application context remains bootable.
 */
@SpringBootTest
@DisplayName("Pools application smoke test")
class PoolsApplicationSmokeTest {
    @Test
    @DisplayName("loads the Spring application context")
    void loadsTheSpringApplicationContext() {
    }
}
