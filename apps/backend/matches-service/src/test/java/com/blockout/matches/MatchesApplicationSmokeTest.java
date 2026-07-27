package com.blockout.matches;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Verifies that matches-service starts against an ephemeral PostgreSQL database. */
@SpringBootTest
@Testcontainers
@DisplayName("Matches application smoke")
class MatchesApplicationSmokeTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  /** Starts the complete Spring application context after Flyway initializes PostgreSQL. */
  @Test
  @DisplayName("starts the application context")
  void contextLoads() {}
}
