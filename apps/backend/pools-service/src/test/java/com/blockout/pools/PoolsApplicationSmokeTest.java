package com.blockout.pools;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Verifies that pools-service starts against an ephemeral PostgreSQL database. */
@SpringBootTest(
    properties = {
      "spring.rabbitmq.dynamic=false",
      "spring.rabbitmq.listener.simple.auto-startup=false"
    })
@Testcontainers
@DisplayName("Pools application smoke test")
class PoolsApplicationSmokeTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

  /** Starts the complete Spring application context after Flyway initializes PostgreSQL. */
  @Test
  @DisplayName("loads the Spring application context")
  void loadsTheSpringApplicationContext() {}
}
