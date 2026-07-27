package com.blockout.clubs;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Verifies that clubs-service starts against an ephemeral PostgreSQL database. */
@DisplayName("Clubs application smoke")
@SpringBootTest(
    properties = {
      "clubs.geocoding.initial-delay=86400000",
      "spring.rabbitmq.dynamic=false",
      "spring.rabbitmq.listener.simple.auto-startup=false",
      "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/unused"
    })
@Testcontainers
class ClubsApplicationSmokeTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  /** Starts the complete Spring application context after Flyway initializes PostgreSQL. */
  @DisplayName("starts the application context")
  @Test
  void contextLoads() {}
}
