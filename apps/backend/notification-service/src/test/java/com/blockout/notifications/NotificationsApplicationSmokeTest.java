package com.blockout.notifications;

import com.blockout.notifications.notification.infrastructure.http.Auth0ServiceTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Verifies that notification-service starts against an ephemeral PostgreSQL database. */
@SpringBootTest(
    properties = {
      "spring.rabbitmq.dynamic=false",
      "spring.rabbitmq.listener.simple.auto-startup=false"
    })
@Testcontainers
@DisplayName("Notifications application smoke")
class NotificationsApplicationSmokeTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @MockitoBean Auth0ServiceTokenProvider auth0ServiceTokenProvider;

  /** Starts the complete Spring application context after Flyway initializes PostgreSQL. */
  @Test
  @DisplayName("starts the application context")
  void contextLoads() {}
}
