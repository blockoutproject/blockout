package com.blockout.users;

import com.blockout.users.config.Auth0TokenManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Verifies that users-service starts against an ephemeral PostgreSQL database. */
@SpringBootTest(properties = "spring.rabbitmq.dynamic=false")
@Testcontainers
@DisplayName("Users application smoke")
class UsersApplicationSmokeTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

  @MockitoBean Auth0TokenManager auth0TokenManager;

  /** Starts the complete Spring application context after Flyway initializes PostgreSQL. */
  @Test
  @DisplayName("starts the application context")
  void contextLoads() {}
}
