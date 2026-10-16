package com.blockout.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.context.WebServerApplicationContext;

/** Verifies that the backend entry point starts its real embedded HTTP server. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("Backend application startup")
class BackendApplicationSmokeTest {
  @Test
  @DisplayName("Starts the embedded HTTP server without provider credentials")
  void startsHttpServer(@Autowired WebServerApplicationContext context) {
    // Given
    // Spring starts the actual application on an isolated ephemeral port.

    // When
    int port = context.getWebServer().getPort();

    // Then
    assertThat(port).isPositive();
  }
}
