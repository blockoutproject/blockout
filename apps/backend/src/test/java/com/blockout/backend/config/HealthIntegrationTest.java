package com.blockout.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Qualifies the real main-port Actuator probe and bounded PostgreSQL failure over HTTP. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("Native readiness with PostgreSQL")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class HealthIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @LocalServerPort private int port;

  @Test
  @DisplayName("Reports aggregate readiness from the actual application port")
  void servesMainPortReadiness() throws Exception {
    // Given
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()) {
      // When
      HttpResponse<String> response = client.send(probe(), HttpResponse.BodyHandlers.ofString());

      // Then
      assertThat(response.statusCode()).isEqualTo(200);
      assertThat(response.body()).isEqualTo("{\"status\":\"UP\"}");
    }
  }

  @Test
  @DisplayName("Returns bounded aggregate-only failure when PostgreSQL stops responding")
  void boundsUnresponsiveDatabase() throws Exception {
    // Given
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()) {
      assertThat(client.send(probe(), HttpResponse.BodyHandlers.ofString()).statusCode())
          .isEqualTo(200);
      database.getDockerClient().pauseContainerCmd(database.getContainerId()).exec();
      try {
        // When
        HttpResponse<String> response = client.send(probe(), HttpResponse.BodyHandlers.ofString());

        // Then
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.body()).isEqualTo("{\"status\":\"DOWN\"}");
      } finally {
        database.getDockerClient().unpauseContainerCmd(database.getContainerId()).exec();
      }
    }
  }

  /**
   * Builds the anonymous main-port probe with a caller-side bound beyond the configured DB waits.
   *
   * @return GET request without credentials, component selection or diagnostic overrides
   */
  private HttpRequest probe() {
    return HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/health"))
        .timeout(Duration.ofSeconds(10))
        .GET()
        .build();
  }
}
